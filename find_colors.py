import os

files = [f for f in os.listdir('.') if f.endswith('.js')]
targets = ['var(--teal)', 'var(--terracotta)', 'rgba(31, 122, 140', 'rgba(217, 93, 57']

for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            lines = file.readlines()
            for idx, line in enumerate(lines):
                for target in targets:
                    if target in line:
                        print(f"{f}:{idx+1}: contains '{target}' -> {line.strip()}")
    except Exception as e:
        print(f"Error reading {f}: {e}")
