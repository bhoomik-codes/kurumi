#!/usr/bin/env python3
"""
airllm_server.py — Local AirLLM HTTP API Server for KURUMI
===========================================================
Wraps AirLLM in a FastAPI server that speaks the OpenAI Chat Completions
protocol, so KURUMI can stream from 30B–405B models with as little as 4 GB VRAM.

Usage:
    python airllm_server.py [--model MODEL_ID] [--shard-dir PATH] [--port PORT]

Examples:
    python airllm_server.py
    python airllm_server.py --model Qwen/Qwen2.5-32B-Instruct
    python airllm_server.py --model meta-llama/Meta-Llama-3-70B-Instruct --hf-token hf_xxx
    python airllm_server.py --model Qwen/Qwen2.5-32B-Instruct --shard-dir /mnt/data/shards --compression 4bit

Requirements:
    pip install airllm fastapi uvicorn

Optional (for 4bit/8bit compression):
    pip install bitsandbytes
"""

import argparse
import asyncio
import json
import os
import sys
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncIterator, List, Optional

import torch
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

# ── CLI arguments ──────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="AirLLM local API server for KURUMI")
parser.add_argument(
    "--model", "-m",
    default=os.environ.get("AIRLLM_MODEL", "Qwen/Qwen2.5-7B-Instruct"),
    help="HuggingFace model ID or local path (default: Qwen/Qwen2.5-7B-Instruct)"
)
parser.add_argument(
    "--shard-dir", "-s",
    default=os.environ.get("AIRLLM_SHARD_DIR", os.path.expanduser("~/airllm_shards")),
    help="Directory to store per-layer shard files (default: ~/airllm_shards)"
)
parser.add_argument(
    "--port", "-p",
    type=int,
    default=int(os.environ.get("AIRLLM_PORT", "8765")),
    help="Port to listen on (default: 8765)"
)
parser.add_argument(
    "--device",
    default=os.environ.get("AIRLLM_DEVICE", "cuda:0"),
    help="PyTorch device string (default: cuda:0)"
)
parser.add_argument(
    "--max-seq-len",
    type=int,
    default=int(os.environ.get("AIRLLM_MAX_SEQ_LEN", "512")),
    help="Maximum sequence length (default: 512)"
)
parser.add_argument(
    "--compression",
    choices=["4bit", "8bit"],
    default=os.environ.get("AIRLLM_COMPRESSION"),
    help="On-disk compression for shards (optional). Saves ~75%% / ~50%% disk space."
)
parser.add_argument(
    "--hf-token",
    default=os.environ.get("HF_TOKEN"),
    help="HuggingFace API token for gated models (e.g. LLaMA)"
)
parser.add_argument(
    "--delete-original",
    action="store_true",
    default=False,
    help="Delete original checkpoint after splitting into shards (saves disk)"
)
args, _ = parser.parse_known_args()

# ── Global model reference ────────────────────────────────────────────────────
model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the model at startup, release at shutdown."""
    global model
    print(f"\n{'='*60}")
    print(f"  AirLLM Server for KURUMI")
    print(f"{'='*60}")
    print(f"  Model      : {args.model}")
    print(f"  Shard dir  : {args.shard_dir}")
    print(f"  Device     : {args.device}")
    print(f"  Max seq len: {args.max_seq_len}")
    print(f"  Compression: {args.compression or 'none'}")
    print(f"  Port       : {args.port}")
    print(f"{'='*60}\n")

    os.makedirs(args.shard_dir, exist_ok=True)

    try:
        from airllm import AutoModel
    except ImportError:
        print("ERROR: airllm is not installed. Run: pip install airllm", file=sys.stderr)
        sys.exit(1)

    print("[AirLLM] Loading model... (first run downloads + splits shards, may take a while)")
    model = AutoModel.from_pretrained(
        args.model,
        device=args.device,
        max_seq_len=args.max_seq_len,
        layer_shards_saving_path=args.shard_dir,
        prefetching=args.compression is None,  # prefetch only when no compression
        compression=args.compression,
        hf_token=args.hf_token,
        delete_original=args.delete_original,
    )
    print(f"[AirLLM] ✓ Model ready → {args.model}")
    print(f"[AirLLM] ✓ Server listening on http://127.0.0.1:{args.port}\n")

    yield  # app runs here

    model = None
    print("[AirLLM] Server shut down.")


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AirLLM Local API",
    description="OpenAI-compatible HTTP API wrapping AirLLM for KURUMI",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic schemas ───────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str = ""
    messages: List[ChatMessage]
    stream: bool = True
    max_tokens: int = 512
    temperature: float = 0.7
    top_p: float = 0.9


# ── Helpers ────────────────────────────────────────────────────────────────────
def build_prompt(messages: List[ChatMessage]) -> str:
    """
    Converts OpenAI-style message list to a plain text prompt.
    Uses the model's tokenizer chat template if available (handles
    system / user / assistant roles natively for instruct models).
    """
    global model
    if model is None:
        raise RuntimeError("Model not loaded")

    # Try the HuggingFace chat template first (best results on instruct models)
    try:
        if hasattr(model.tokenizer, "apply_chat_template") and model.tokenizer.chat_template:
            prompt = model.tokenizer.apply_chat_template(
                [{"role": m.role, "content": m.content} for m in messages],
                tokenize=False,
                add_generation_prompt=True,
            )
            return prompt
    except Exception:
        pass  # fall through to manual construction

    # Fallback: simple role-labelled concatenation
    parts = []
    for m in messages:
        if m.role == "system":
            parts.append(f"System: {m.content}")
        elif m.role == "user":
            parts.append(f"User: {m.content}")
        elif m.role == "assistant":
            parts.append(f"Assistant: {m.content}")
    parts.append("Assistant:")
    return "\n\n".join(parts)


async def token_stream_generator(
    messages: List[ChatMessage],
    max_tokens: int,
    reply_id: str,
) -> AsyncIterator[str]:
    """Runs inference and streams word-by-word SSE chunks."""
    global model

    if model is None:
        yield f"data: {json.dumps({'error': 'Model not loaded'})}\n\n"
        yield "data: [DONE]\n\n"
        return

    created = int(time.time())
    prompt = build_prompt(messages)

    try:
        input_ids = model.tokenizer(
            [prompt],
            return_tensors="pt",
            return_attention_mask=False,
            truncation=True,
            max_length=args.max_seq_len,
            padding=False,
        )["input_ids"].to(args.device)
    except Exception as e:
        err_chunk = {"error": f"Tokenization failed: {e}"}
        yield f"data: {json.dumps(err_chunk)}\n\n"
        yield "data: [DONE]\n\n"
        return

    # Run generation (blocking — AirLLM streams internally via hooks)
    try:
        with torch.no_grad():
            output = model.generate(
                input_ids,
                max_new_tokens=max_tokens,
                do_sample=False,   # greedy — fastest; set True for sampling
                return_dict_in_generate=True,
            )
    except Exception as e:
        err_chunk = {"error": f"Generation failed: {e}"}
        yield f"data: {json.dumps(err_chunk)}\n\n"
        yield "data: [DONE]\n\n"
        return

    new_ids = output.sequences[0][input_ids.shape[1]:]
    full_text = model.tokenizer.decode(new_ids, skip_special_tokens=True)

    # Emit word-by-word for a nice streaming effect in KURUMI
    words = full_text.split(" ")
    for i, word in enumerate(words):
        token = word if i == 0 else " " + word
        chunk = {
            "id": reply_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": args.model,
            "choices": [{
                "index": 0,
                "delta": {"content": token},
                "finish_reason": None,
            }],
        }
        yield f"data: {json.dumps(chunk)}\n\n"
        await asyncio.sleep(0)  # yield event loop

    # Final done chunk
    done_chunk = {
        "id": reply_id,
        "object": "chat.completion.chunk",
        "created": created,
        "model": args.model,
        "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
    }
    yield f"data: {json.dumps(done_chunk)}\n\n"
    yield "data: [DONE]\n\n"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status": "AirLLM server running",
        "model": args.model,
        "device": args.device,
        "port": args.port,
        "ready": model is not None,
    }


@app.get("/health")
def health():
    return {"ok": model is not None}


@app.get("/v1/models")
def list_models():
    return {
        "object": "list",
        "data": [{
            "id": args.model,
            "object": "model",
            "created": 0,
            "owned_by": "airllm",
        }],
    }


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest, raw: Request):
    if model is None:
        raise HTTPException(status_code=503, detail="Model is still loading. Please wait.")

    reply_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"

    if request.stream:
        return StreamingResponse(
            token_stream_generator(request.messages, request.max_tokens, reply_id),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    # Non-streaming path
    prompt = build_prompt(request.messages)
    input_ids = model.tokenizer(
        [prompt],
        return_tensors="pt",
        return_attention_mask=False,
        truncation=True,
        max_length=args.max_seq_len,
        padding=False,
    )["input_ids"].to(args.device)

    with torch.no_grad():
        out = model.generate(
            input_ids,
            max_new_tokens=request.max_tokens,
            do_sample=False,
            return_dict_in_generate=True,
        )

    text = model.tokenizer.decode(
        out.sequences[0][input_ids.shape[1]:],
        skip_special_tokens=True,
    )

    return JSONResponse({
        "id": reply_id,
        "object": "chat.completion",
        "created": int(time.time()),
        "model": args.model,
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": text},
            "finish_reason": "stop",
        }],
        "usage": {"prompt_tokens": -1, "completion_tokens": -1, "total_tokens": -1},
    })


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=args.port)
