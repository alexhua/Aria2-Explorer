import Utils from "./utils.js";

const DefaultRemote = { name:"Aria2", rpcUrl: "http://localhost:6800/jsonrpc", secretKey: '' };

class Aria2 {
    static requestId = 0;

    constructor(remote = DefaultRemote) {
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
    setRemote(name="Aria2", rpcUrl, secretKey = '') {
        if (rpcUrl == this.rpcUrl && secretKey == this.secretKey)
            return this;
        if (!Utils.validateRpcUrl(rpcUrl))
            throw new Error("Invalid RPC URL!");
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        return Object.assign(this, { name, rpcUrl, secretKey });
    }

    openSocket() {
        let url = this.rpcUrl;
        if (url.startsWith("http"))
            url = url.replace("http", "ws");

        if (this.socket && this.socket.url == url && this.socket.readyState <= 1)
            return this.socket;
        try {
            this.socket = new WebSocket(url);
        } catch (error) {
            console.log(error);
        }
        return this.socket
    }

    closeSocket() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    async #doRPC(request) {
        let url = request.url;
        let socket = this.socket;
        return new Promise((resolve, reject) => {
            /* via websocket */
            if (socket) {
                switch (socket.readyState) {
                    case 0:
                        socket.onopen = (event) => {
                            socket.send(request.payload);
                        };
                        break;
                    case 1:
                        socket.send(request.payload);
                        break;
                    case 2:
                    case 3:
                        let error = new Error("Aria2 is unreachable");
                        reject(error);
                        break;
                    default:
                        error = new Error("Unknown socket state:", socket.readyState);
                        reject(error);
                }
                socket.onmessage = (event) => {
                    let response = JSON.parse(event.data);
                    if (response.id == request.id)
                        resolve(response);
                };
                socket.onerror = (error) => {
                    reject(error);
                    this.socket = null;
                };
            } else { /* via http fetch */
                if (url.startsWith("ws"))
                    url = url.replace("ws", "http");

                fetch(url, {
                    method: "POST",
                    body: request.payload,
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    }
                }).then(response => {
                    resolve(response.json());
                }).catch(error => {
                    reject(error);
                });
            }
        });
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
        if (!Array.isArray(uris)) 
            uris = [uris];
        let request = this.#buildRequest("aria2.addUri", uris, options);
        return this.#doRPC(request);
    }

    getGlobalStat() {
        let request = this.#buildRequest("aria2.getGlobalStat");
        return this.#doRPC(request);
    }

    getFiles(gid) {
        let request = this.#buildRequest("aria2.getFiles", gid);
        return this.#doRPC(request);
    }
}

export default Aria2;
