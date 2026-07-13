import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

brain_dir = r"C:\Users\NITHIN S SHETTY\.gemini\antigravity\brain"
password_pattern = re.compile(r'password\s*[:=]\s*[\'"]?([^\'"\s,;]+)[\'"]?', re.IGNORECASE)
mysql_pattern = re.compile(r'mysql', re.IGNORECASE)

for root, dirs, files in os.walk(brain_dir):
    # Skip standard system generated logs if they are not transcripts
    for file in files:
        if file.endswith(('.jsonl', '.md', '.js', '.txt')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    if 'mysql' in content.lower() and ('password' in content.lower() or 'pass' in content.lower()):
                        print(f"Match found in: {os.path.relpath(path, brain_dir)}")
                        lines = content.splitlines()
                        for idx, line in enumerate(lines):
                            if 'mysql' in line.lower() or 'password' in line.lower():
                                print(f"  Line {idx+1}: {line.strip()[:150]}")
            except Exception as e:
                pass
