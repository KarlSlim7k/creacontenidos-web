<?php

require_once __DIR__ . '/env.php';

function db(): PDO
{
  static $pdo = null;
  if ($pdo instanceof PDO) {
    return $pdo;
  }

  $host = getenv('POSTGRES_HOST') ?: 'localhost';
  $port = getenv('POSTGRES_PORT') ?: '5432';
  $dbName = getenv('POSTGRES_DB') ?: 'crea_db';
  $user = getenv('POSTGRES_USER') ?: 'crea';
  $pass = getenv('POSTGRES_PASSWORD') ?: '';

  $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', $host, $port, $dbName);

  try {
    $pdo = new PDO($dsn, $user, $pass, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
  } catch (Throwable $e) {
    error_log('[DB] Connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión a base de datos']);
    exit;
  }
}

function dbQuery(string $sql, array $params = []): PDOStatement
{
  $stmt = db()->prepare($sql);
  $stmt->execute($params);
  return $stmt;
}

function dbFetchAll(string $sql, array $params = []): array
{
  return dbQuery($sql, $params)->fetchAll();
}

function dbFetchOne(string $sql, array $params = []): ?array
{
  $row = dbQuery($sql, $params)->fetch();
  return $row === false ? null : $row;
}

function dbExec(string $sql, array $params = []): int
{
  return dbQuery($sql, $params)->rowCount();
}

function dbInsert(string $table, array $data, string $returning = '*'): array
{
  $cols = array_keys($data);
  $placeholders = array_map(fn($c) => ':' . $c, $cols);
  $sql = sprintf(
    'INSERT INTO %s (%s) VALUES (%s) RETURNING %s',
    $table,
    implode(', ', $cols),
    implode(', ', $placeholders),
    $returning
  );
  $row = dbFetchOne($sql, $data);
  if ($row === null) {
    throw new RuntimeException('Insert failed');
  }
  return $row;
}

function dbUpdate(string $table, array $data, string $whereSql, array $whereParams, string $returning = '*'): ?array
{
  $sets = [];
  foreach (array_keys($data) as $col) {
    $sets[] = $col . ' = :' . $col;
  }

  $sql = sprintf('UPDATE %s SET %s WHERE %s RETURNING %s', $table, implode(', ', $sets), $whereSql, $returning);
  return dbFetchOne($sql, array_merge($data, $whereParams));
}

function dbDelete(string $table, string $whereSql, array $whereParams): int
{
  $sql = sprintf('DELETE FROM %s WHERE %s', $table, $whereSql);
  return dbExec($sql, $whereParams);
}

function pgTextArrayLiteral(array $values): string
{
  $items = [];
  foreach ($values as $v) {
    if ($v === null) continue;
    $v = (string)$v;
    $v = str_replace(['\\', '"'], ['\\\\', '\\"'], $v);
    if (preg_match('/[,\s{}"]/u', $v)) {
      $items[] = '"' . $v . '"';
    } else {
      $items[] = $v;
    }
  }
  return '{' . implode(',', $items) . '}';
}

function isoDateTime(?string $ts): ?string
{
  if ($ts === null || $ts === '') return null;
  $t = strtotime($ts);
  if ($t === false) return $ts;
  return gmdate('c', $t);
}

