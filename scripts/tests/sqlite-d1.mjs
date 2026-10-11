import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const bridge = `import sqlite3, json, sys, pathlib
payload=json.load(sys.stdin)
connection=sqlite3.connect(sys.argv[1]);connection.row_factory=sqlite3.Row
if payload.get('init'):
 for migration in sorted(pathlib.Path(sys.argv[2], 'migrations').glob('*.sql')): connection.executescript(migration.read_text())
results=[]
for statement in payload.get('statements',[]):
 cursor=connection.execute(statement['sql'],statement.get('params',[]))
 results.append({'success': True, 'results':[dict(row) for row in cursor.fetchall()] if cursor.description else []})
connection.commit();print(json.dumps(results))
`;
export function sqliteD1(t) {
  const directory = mkdtempSync(join(tmpdir(), 'phwalls-mini-api-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const run = (payload) =>
    JSON.parse(
      execFileSync(
        'python3',
        ['-c', bridge, join(directory, 'fixture.db'), root],
        { input: JSON.stringify(payload), encoding: 'utf8' },
      ),
    );
  run({ init: true });
  const db = {
    prepare(sql) {
      return {
        sql,
        params: [],
        bind(...params) {
          this.params = params;
          return this;
        },
        async all() {
          return run({ statements: [this] })[0];
        },
        async first() {
          return (await this.all()).results[0] || null;
        },
      };
    },
    async batch(statements) {
      return run({ statements });
    },
    seed(statements) {
      run({ statements });
    },
  };
  db.seed([
    {
      sql: "INSERT INTO w_brands(slug,title,kind,create_date,updated_date) VALUES('samsung','Samsung','mobile',1,1),('windows','Windows','desktop',1,1),('empty','Empty','mobile',1,1)",
    },
    {
      sql: "INSERT INTO w_devices(id,brand_name,device_name,device_slug,device_category,release_date,status,create_date,updated_date) VALUES('device-old','samsung','Galaxy S25','galaxy-s25','phone','2025/1/22','published',1,1),('device-new','samsung','Galaxy S27','galaxy-s27','phone','2026/10','published',1,1),('device-sept','samsung','Galaxy S26','galaxy-s26','phone','2026/9/25','published',1,1),('device-desktop','windows','Windows 100% Edition','windows-11','desktop','2025/06','published',1,1),('device-draft','samsung','Private Device','private-device','phone','2027','draft',1,1)",
    },
    ...[
      [
        'asset-primary',
        'device-old',
        'z-primary',
        'static',
        'published',
        'none',
        1,
      ],
      [
        'asset-other',
        'device-old',
        'a-other',
        'static',
        'published',
        'none',
        0,
      ],
      ['asset-live', 'device-old', 'live', 'dynamic', 'published', 'none', 1],
      [
        'asset-deleted',
        'device-old',
        'deleted',
        'static',
        'published',
        'processing',
        0,
      ],
      [
        'asset-unpublished',
        'device-old',
        'unpublished',
        'static',
        'unpublished',
        'none',
        0,
      ],
      [
        'asset-private',
        'device-draft',
        'private',
        'static',
        'published',
        'none',
        1,
      ],
      ['asset-new', 'device-new', 'new', 'static', 'published', 'none', 1],
      ['asset-sept', 'device-sept', 'sept', 'static', 'published', 'none', 1],
      [
        'asset-desktop',
        'device-desktop',
        '100% Edition',
        'static',
        'published',
        'none',
        1,
      ],
    ].map(([id, device, name, media, status, deletion, primary]) => ({
      sql: 'INSERT INTO w_wallpapers(id,device_id,name,mime_type,size_bytes,origin_key,compress_key,file_format,media_type,category,is_primary,tags,status,create_date,updated_date,deletion_state) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      params: [
        id,
        device,
        name,
        media === 'dynamic' ? 'video/mp4' : 'image/png',
        2048,
        `samsung/Galaxy/origin/${id}.${media === 'dynamic' ? 'mp4' : 'png'}`,
        `samsung/Galaxy/compress/${id}.webp`,
        media === 'dynamic' ? 'mp4' : 'png',
        media,
        device === 'device-desktop' ? 'desktop' : 'phone',
        primary,
        '[]',
        status,
        1,
        1,
        deletion,
      ],
    })),
    {
      sql: "INSERT INTO w_device_i18n(id,device_id,language,display_name,description,create_date,updated_date) VALUES('static-zh','device-old','zh','三星 Galaxy S25','静态合集',1,1)",
    },
    {
      sql: "INSERT INTO w_live_device_i18n(id,device_id,language,display_name,description,create_date,updated_date) VALUES('live-zh','device-old','zh','Galaxy S25 动态','动态合集',1,1),('live-en','device-old','en','Galaxy S25 Live','English live description',1,1)",
    },
  ]);
  return db;
}
