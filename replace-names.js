import fs from 'fs';

// server.ts
let serverContent = fs.readFileSync('server.ts', 'utf8');
serverContent = serverContent.replace(/name:\s*'[^']+'/g, (match, offset, string) => {
    // Look backward from the match to find the symbol
    const precedingText = string.substring(Math.max(0, offset - 100), offset);
    const symbolMatch = precedingText.match(/symbol:\s*'([^']+)'/);
    if (symbolMatch) {
        return `name: '${symbolMatch[1]}'`;
    }
    return match;
});
fs.writeFileSync('server.ts', serverContent);

// constants.ts
let constantsContent = fs.readFileSync('constants.ts', 'utf8');
constantsContent = constantsContent.replace(/dispName:\s*'[^']+'/g, (match, offset, string) => {
    // Look backward from the match to find the symbol
    const precedingText = string.substring(Math.max(0, offset - 150), offset);
    const symbolMatch = precedingText.match(/symbol:\s*'([^']+)'/);
    if (symbolMatch) {
        return `dispName: '${symbolMatch[1]}'`;
    }
    return match;
});
fs.writeFileSync('constants.ts', constantsContent);

console.log('Update Complete!');
