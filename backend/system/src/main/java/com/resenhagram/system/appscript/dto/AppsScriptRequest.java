package com.resenhagram.system.appscript.dto;

public class AppsScriptRequest {

    private String secret;
    private String action;
    private Object payload;

    public AppsScriptRequest() {
    }

    public AppsScriptRequest(String secret, String action, Object payload) {
        this.secret = secret;
        this.action = action;
        this.payload = payload;
    }

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public Object getPayload() {
        return payload;
    }

    public void setPayload(Object payload) {
        this.payload = payload;
    }
}
