
import fs from 'fs';
import path from 'path';

function checkUnclosedTags(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Simple tag counting (won't catch everything but good for orphan tags)
    // We only care about React components that use tags
    const tags = content.match(/<([A-Z][a-zA-Z0-9]*|AnimatePresence|motion\.[a-z]+)[^>]*>|<\/([A-Z][a-zA-Z0-9]*|AnimatePresence|motion\.[a-z]+)>/g) || [];
    
    let stack = [];
    for (let tag of tags) {
        if (tag.startsWith('</')) {
            const tagName = tag.match(/<\/([A-Z][a-zA-Z0-9]*|AnimatePresence|motion\.[a-z]+)>/)[1];
            if (stack.length === 0 || stack[stack.length - 1] !== tagName) {
                console.log(`ORPHAN CLOSING TAG: ${tag} in ${filePath}`);
            } else {
                stack.pop();
            }
        } else if (tag.endsWith('/>')) {
            // self closing, ignore
        } else {
            const tagName = tag.match(/<([A-Z][a-zA-Z0-9]*|AnimatePresence|motion\.[a-z]+)/)[1];
            stack.push(tagName);
        }
    }
    if (stack.length > 0) {
        console.log(`UNCLOSED TAGS: ${stack.join(', ')} in ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (let file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') walkDir(fullPath);
        } else if (file.endsWith('.tsx')) {
            checkUnclosedTags(fullPath);
        }
    }
}

walkDir('c:\\Users\\marce\\OneDrive\\Desktop\\Sistema - Promessa\\src');
