<?php

function loadEnvFile(string $path): void
{
  if (!is_file($path) || !is_readable($path)) {
    return;
  }

  $lines = file($path, FILE_IGNORE_NEW_LINES);
  if ($lines === false) {
    return;
  }

  foreach ($lines as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#')) {
      continue;
    }

    $eqPos = strpos($line, '=');
    if ($eqPos === false) {
      continue;
    }

    $key = trim(substr($line, 0, $eqPos));
    if ($key === '') {
      continue;
    }

    $value = trim(substr($line, $eqPos + 1));
    if ($value !== '' && (($value[0] === '"' && str_ends_with($value, '"')) || ($value[0] === "'" && str_ends_with($value, "'")))) {
      $value = substr($value, 1, -1);
    }

    if (getenv($key) !== false) {
      continue;
    }

    putenv($key . '=' . $value);
    $_ENV[$key] = $value;
  }
}

function envBootstrap(): void
{
  static $booted = false;
  if ($booted) return;
  $booted = true;

  $rootEnv = dirname(__DIR__, 2) . '/.env';
  loadEnvFile($rootEnv);
}

envBootstrap();

