"""Standalone SQLite regression checks for production quota statements."""
import concurrent.futures
import pathlib
import re
import sqlite3
import tempfile
import uuid

root = pathlib.Path(__file__).resolve().parent.parent
source = (root / 'src/lib/download-quota.ts').read_text()
reserve_sql = re.search(r'export const RESERVE_DOWNLOAD_SQL = `(.+?)`;', source, re.S).group(1)
complete_sql = re.search(r'export const COMPLETE_DOWNLOAD_SQL = `(.+?)`;', source, re.S).group(1)
day, ip = '2026-11-13', '192.0.2.1'
with tempfile.NamedTemporaryFile() as file:
    db = sqlite3.connect(file.name)
    for migration in ['0022_daily_download_limit.sql', '0023_download_reservations.sql']:
        db.executescript((root / 'migrations' / migration).read_text())
    def limit(value):
        db.execute('UPDATE w_download_settings SET daily_limit=? WHERE id=1', (value,))
        db.commit()
    def reserve(current_day=day, current_ip=ip):
        token = str(uuid.uuid4())
        with sqlite3.connect(file.name, timeout=30) as connection:
            row = connection.execute(reserve_sql, (token, current_day, current_ip, current_day, current_ip, current_day, current_ip)).fetchone()
            return row[0] if row else None
    def settle(token, success):
        with sqlite3.connect(file.name, timeout=30) as connection:
            if success:
                connection.execute(complete_sql, (token,))
            connection.execute('DELETE FROM w_download_reservations WHERE id=?', (token,))
    def used(current_day=day):
        row = db.execute('SELECT downloads FROM w_download_daily_usage WHERE day=? AND ip=?', (current_day, ip)).fetchone()
        return row[0] if row else 0
    limit(0)
    assert reserve() is None
    limit(5)
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        tokens = [token for token in pool.map(lambda _: reserve(), range(30)) if token]
    assert len(tokens) == 5
    assert used() == 0  # In-flight downloads have not succeeded yet.
    settle(tokens[0], True)
    settle(tokens[0], True)  # A repeated completion must not double charge.
    assert used() == 1
    assert reserve() is None
    settle(tokens[1], False)
    settle(tokens[1], False)  # A repeated cancellation must not free another slot.
    replacement = reserve()
    assert replacement and reserve() is None
    assert reserve(current_ip='192.0.2.2')
    tomorrow = reserve(current_day='2026-11-14')
    assert tomorrow
    settle(tokens[2], True)  # Complete after midnight against the reserved date.
    assert used() == 2 and used('2026-11-14') == 0
    limit(2)
    assert reserve() is None
    for token in tokens[3:] + [replacement]:
        settle(token, False)
    limit(None)
    token = reserve()
    settle(token, True)
    assert used() == 3
print('PASS: concurrent reservations, success-only counts, cancellation, idempotent settlement, separate IP/day, limit changes')
