"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findInstructions = findInstructions;
var fs_1 = require("fs");
var path_1 = require("path");
function findInstructions() {
    var currentDir = process.cwd();
    var combined = [];
    while (true) {
        var kurumiPath = path_1.default.join(currentDir, '.kurumi', 'instructions.md');
        if (fs_1.default.existsSync(kurumiPath)) {
            try {
                combined.push(fs_1.default.readFileSync(kurumiPath, 'utf8'));
            }
            catch (_a) { }
        }
        try {
            var files = fs_1.default.readdirSync(currentDir);
            var claudeFiles = files.filter(function (f) { return f.toLowerCase() === 'claude.md'; });
            for (var _i = 0, claudeFiles_1 = claudeFiles; _i < claudeFiles_1.length; _i++) {
                var claudeFile = claudeFiles_1[_i];
                combined.push(fs_1.default.readFileSync(path_1.default.join(currentDir, claudeFile), 'utf8'));
            }
        }
        catch (_b) { }
        if (combined.length > 0) {
            return combined.join('\n\n---\n\n');
        }
        var parentDir = path_1.default.dirname(currentDir);
        if (parentDir === currentDir)
            break; // root
        currentDir = parentDir;
    }
    return null;
}
