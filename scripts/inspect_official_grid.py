import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('Assets/generated/authoritative_timetable.json', 'r', encoding='utf-8') as f:
    tt = json.load(f)

entries = tt['entries']
days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

for sec in ['A', 'B']:
    print(f"\n==================== SECTION {sec} ====================")
    sec_entries = [e for e in entries if e['section'] == sec]
    for d in days:
        d_entries = [e for e in sec_entries if e['day'] == d]
        # sort by startTime
        d_entries.sort(key=lambda x: x['startTime'])
        slots = [f"P{e['period']}[{e['startTime']}-{e['endTime']}]: {e['subjectCodeShort']} ({e['facultyShort']}) room:{e.get('room')}" for e in d_entries]
        print(f"{d[:3]}: " + " | ".join(slots))

print("\n--- ALL UNIQUE SUBJECTS ---")
subjects = {}
for e in entries:
    sub = e['subjectName']
    short = e['subjectCodeShort']
    if short not in subjects:
        subjects[short] = {'name': sub, 'type': e.get('type'), 'faculty': set()}
    subjects[short]['faculty'].add(f"{e.get('facultyName')} ({e.get('facultyShort')})")

for k, v in subjects.items():
    print(f"{k} -> {v['name']} [{v['type']}], Faculty: {', '.join(v['faculty'])}")
