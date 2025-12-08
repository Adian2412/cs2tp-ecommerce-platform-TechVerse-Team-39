<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EnsureSessionsTableExists
{
    /**
     * Handle an incoming request.
     * 
     * This middleware ensures the sessions table exists before the session middleware runs.
     * This prevents "sessions table doesn't exist" errors when setting up the database.
     * 
     * Designed for MySQL/MariaDB (Virtualmin deployment).
     */
    public function handle(Request $request, Closure $next)
    {
        // Check if we're using database sessions
        $sessionDriver = config('session.driver');
        if ($sessionDriver !== 'database') {
            return $next($request);
        }
        
        try {
            $pdo = DB::connection()->getPdo();
            
            // Check if sessions table exists (MySQL syntax)
            $tableExists = $this->tableExists($pdo);
            
            if (!$tableExists) {
                $this->createSessionsTable($pdo);
            }
        } catch (\Exception $e) {
            // If we can't create the table, continue anyway
            // The session middleware will handle the error or fall back gracefully
            \Log::warning('EnsureSessionsTableExists: ' . $e->getMessage());
        }
        
        return $next($request);
    }

    /**
     * Check if sessions table exists in MySQL
     */
    private function tableExists(\PDO $pdo): bool
    {
        try {
            $stmt = $pdo->query("SHOW TABLES LIKE 'sessions'");
            return $stmt->rowCount() > 0;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Create the sessions table for MySQL/MariaDB
     */
    private function createSessionsTable(\PDO $pdo): void
    {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS sessions (
                id VARCHAR(255) PRIMARY KEY,
                user_id BIGINT UNSIGNED NULL,
                ip_address VARCHAR(45) NULL,
                user_agent TEXT NULL,
                payload LONGTEXT NOT NULL,
                last_activity INT NOT NULL,
                INDEX idx_sessions_user_id (user_id),
                INDEX idx_sessions_last_activity (last_activity)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    }
}
