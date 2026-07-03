package com.resenhagram.system.appscript;

/**
 * Lançada quando o Apps Script retorna { ok: false, error: "..." }
 * ou quando a chamada HTTP falha.
 */
public class AppsScriptException extends RuntimeException {

    public AppsScriptException(String message) {
        super(message);
    }

    public AppsScriptException(String message, Throwable cause) {
        super(message, cause);
    }
}
