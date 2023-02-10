import Utils from "./utils.js";

const defaultAria2 = { rpcUrl: "http://localhost:6800/jsonrpc", secretKey: '' };

class Aria2 {
    static requestId = 0;

    constructor(remote = defaultAria2) {
        Object.assign(this, remote);
    }

    get sid() {
        return Aria2.requestId++;
    }

    /**
     * Change the remote rpc url and secret key. This will 
     * cause existing websocket to be closed.
     * 
     * @param {string} rpcUrl Aria2 rpc url
     * @param {string} secretKey Aria2 rpc secret key
     */
    changeRemote(rpcUrl, secretKey = '') {
        if (rpcUrl == this.rpcUrl && secretKey == this.secretKey)
            return this;
        if (!Utils.validateRpcUrl(rpcUrl))
            throw new Error("Invalid RPC URL!");
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        Object.assign(this, { rpcUrl, secretKey });
        return this;
    }

    openSocket(url = this.rpcUrl) {
        if (url.startsWith("http"))
            url = url.replace("http", "ws");

        if (this.socket && this.socket.url == url && this.socket.socketState == 1)
            return this.socket;

        if (this.rpcUrl != url) {
            this.rpcUrl = url;
            if (this.socket) {
                this.closeSocket();
            }
        }
        return this.socket = new WebSocket(url);
    }

    closeSocket() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    async #doRPC(request) {
        let url = request.url;
        /* via websocket */
        if (this.socket) {
            return new Promise((resolve, reject) => {
                if (this.socket.socketState == 1) {
                    this.socket.send(request.payload);
                } else {
                    if (url.startsWith("http"))
                        url = url.replace("http", "ws");
                    this.openSocket(url).onopen((event) => {
                        this.socket.send(request.payload);
                    });
                }
                this.socket.onmessage = (event) => {
                    let response = JSON.parse(event.data);
                    if (response.id == request.id)
                        resolve(response);
                }
                this.socket.onerror = (error) => {
                    reject(error);
                }
            })
        } else { /* via http fetch */
            if (url.startsWith("ws"))
                url = url.replace("ws", "http");
            const response = await fetch(url,
                {
                    method: "POST",
                    body: request.payload,
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    }
                });
            return response.json();
        }
    }
    /**
     * Build rpc request
     * @param method {string} Aria2 rpc method
     * @param params {array} Rpc params array     * 
     */
    #buildRequest(method, ...params) {
        let id = this.sid;
        let request = { id, url: this.rpcUrl, payload: '' };
        if (this.secretKey) {
            params.unshift("token:" + this.secretKey);
        }
        request.payload = JSON.stringify({
            "jsonrpc": "2.0",
            "method": method,
            "id": id,
            "params": params
        });
        return request;
    }

    addUri(uris, options) {
        if (!Array.isArray(uris)) uris = [uris];
        let request = this.#buildRequest("aria2.addUri", uris, options);
        return this.#doRPC(request);
    }

    getGlobalStat() {
        let request = this.#buildRequest("aria2.getGlobalStat");
        return this.#doRPC(request);
    }

    getFiles(gid) {
        let request = this.#buildRequest("aria2.getGlobalStat", gid);
        return this.#doRPC(request);
    }
}

export default Aria2;
