#!/usr/bin/env bash
set -euo pipefail

# Run from any directory: ./scripts/generate-admin-password-hash.sh
if ! command -v node >/dev/null 2>&1; then
  echo '请先安装 Node.js，再运行此脚本。' >&2
  exit 1
fi

if [[ ! -t 0 ]]; then
  echo '请在交互式终端中直接运行此脚本，以隐藏密码输入。' >&2
  exit 1
fi

task_script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
trap 'unset task_admin_password task_admin_password_confirmation' EXIT

if ! IFS= read -r -s -p '请输入管理员密码（至少 8 个字符，输入隐藏）：' task_admin_password; then
  echo >&2
  exit 1
fi
echo >&2

if ! IFS= read -r -s -p '请再次输入密码：' task_admin_password_confirmation; then
  echo >&2
  exit 1
fi
echo >&2

if [[ "$task_admin_password" != "$task_admin_password_confirmation" ]]; then
  echo '两次密码不一致，请重新运行脚本。' >&2
  exit 1
fi

ADMIN_PASSWORD="$task_admin_password" node "$task_script_dir/hash-admin-password.mjs"
