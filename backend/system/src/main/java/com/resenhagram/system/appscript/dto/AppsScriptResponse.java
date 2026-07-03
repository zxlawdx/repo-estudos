package com.resenhagram.system.appscript.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Map;

/**
 * Representa o envelope padrão retornado pelo Apps Script:
 * { "ok": true, "data": {...} }  ou  { "ok": false, "error": "..." }
 *
 * Como várias ações legadas retornam campos extras na raiz
 * (ex.: { ok:true, file:..., fileId:... }), mantemos também
 * o mapa bruto para permitir acesso a qualquer campo.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class AppsScriptResponse {

    private boolean ok;
    private Object data;
    private String error;
    private Map<String, Object> raw;

    public boolean isOk() {
        return ok;
    }

    public void setOk(boolean ok) {
        this.ok = ok;
    }

    public Object getData() {
        return data;
    }

    public void setData(Object data) {
        this.data = data;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public Map<String, Object> getRaw() {
        return raw;
    }

    public void setRaw(Map<String, Object> raw) {
        this.raw = raw;
    }
}
