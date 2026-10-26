ALTER TABLE w_devices ADD COLUMN upload_prefix TEXT DEFAULT NULL
  CHECK (upload_prefix IS NULL OR (length(upload_prefix) BETWEEN 1 AND 300
    AND upload_prefix = trim(upload_prefix) AND upload_prefix NOT LIKE '/%'
    AND upload_prefix NOT LIKE '%/' AND instr(upload_prefix, '//') = 0
    AND instr(upload_prefix, '..') = 0 AND instr(upload_prefix, ':') = 0
    AND instr(upload_prefix, char(92)) = 0));
CREATE UNIQUE INDEX idx_devices_upload_prefix ON w_devices(upload_prefix) WHERE upload_prefix IS NOT NULL;
