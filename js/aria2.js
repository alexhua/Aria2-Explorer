import Utils from "./utils.js";

const DEBUG = false;
const SOCKET_TIMEOUT = 30 * 1000;
const DEFAULT_ARIA2 = { name: "Aria2", rpcUrl: "http://localhost:6800/jsonrpc", secretKey: '' };

class Aria2 {
    static RequestId = 0;

    #isLocalhost;
    #messageHandlers;
    #pendingRequests;

    /**
     * @param {object} Aria2 
     * @param {string} Aria2.name
     * @param {string} Aria2.rpcUrl 
     * @param {string} Aria2.secretKey
     */
    constructor(aria2 = DEFAULT_ARIA2) {
        Object.assign(this, aria2);
        this.#isLocalhost = Utils.isLocalhost(this.rpcUrl);
        this.#messageHandlers = new Set();
        this.#pendingRequests = new Map(); // Used to manage pending RPC requests
        this.socket = null;
    }

    get sid() {
        return Aria2.RequestId++;
    }

    get isLocalhost() {
        return this.#isLocalhost;
    }

    /**
     * Change the remote RPC URL and secretKey, closing any existing WebSocket connection.
     * @param {string} rpcUrl Aria2 RPC URL
     * @param {string} secretKey Aria2 RPC secretKey
     */
    setRemote(name = "Aria2", rpcUrl, secretKey = '') {
        if (rpcUrl === this.rpcUrl && secretKey === this.secretKey)
            return this;
        if (Utils.validateRpcUrl(rpcUrl) !== 'VALID')
            throw new Error("Invalid RPC URL!");
        this.closeSocket();
        this.#isLocalhost = Utils.isLocalhost(rpcUrl);
        Object.assign(this, { name, rpcUrl, secretKey });
        return this;
    }

    /**
     * Open the WebSocket connection and register global event listeners.
     */
    openSocket() {
        let url = this.rpcUrl;
        if (url.startsWith("http"))
            url = url.replace(/^http/, "ws");
        if (this.socket && this.socket.url === url && this.socket.readyState <= WebSocket.OPEN)
            return this.socket;

        try {
            this.socket = new WebSocket(url);

            // Register a global message event listener to handle all RPC responses and subscription messages.
            this.socket.addEventListener('message', this.#onMessage.bind(this));

            // Error event: notify all pending requests about the error.
            this.socket.addEventListener('error', (event) => {
                this.#pendingRequests.forEach(({ reject }) => {
                    reject(new Error("WebSocket encountered an error"));
                });
                this.#pendingRequests.clear();
            });

            // Close event: also notify all pending requests.
            this.socket.addEventListener('close', (event) => {
                this.#pendingRequests.forEach(({ reject }) => {
                    reject(new Error("WebSocket closed"));
                });
                this.#pendingRequests.clear();
            });
        } catch (error) {
            console.error(error.message);
        }
        return this.socket;
    }

    /**
     * Close the WebSocket connection.
     */
    closeSocket() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    /**
     * Global message handler that dispatches messages to the corresponding pending requests
     * and to all registered external message handlers.
     * @param {MessageEvent} event 
     */
    #onMessage(event) {
        let data;
        try {
            data = JSON.parse(event.data);
            data.source = this;
        } catch (error) {
            console.error(`${this.name} received invalid message: ${event.data}`);
            return;
        }
        // If the message includes an id, check if it corresponds to a pending request.
        if (data.id !== undefined && this.#pendingRequests.has(data.id)) {
            const { resolve } = this.#pendingRequests.get(data.id);
            resolve(data);
            this.#pendingRequests.delete(data.id);
        }
        // Dispatch the message to all registered message handlers.
        this.#messageHandlers.forEach((handler) => {
            try {
                handler(data);
            } catch (error) {
                console.error("Message handler error:", error);
            }
        });
    }

    /**
     * Register a message handler.
     * @param {function} messageHandler 
     */
    regMessageHandler(messageHandler) {
        if (typeof messageHandler !== 'function') {
            throw new Error("Invalid aria2 message handler");
        }
        this.#messageHandlers.add(messageHandler);
    }

    /**
     * Unregister a message handler.
     * @param {function} messageHandler 
     */
    unRegMessageHandler(messageHandler) {
        if (typeof messageHandler !== 'function') {
            throw new Error("Invalid aria2 message handler");
        }
        this.#messageHandlers.delete(messageHandler);
    }

    /**
     * Internal method to send an RPC request (supports both WebSocket and HTTP fetch).
     * @param {object} request Request object containing id, url, and payload.
     * @returns {Promise}
     */
    async #doRPC(request) {
        // Prefer using WebSocket if it is open.
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            return new Promise((resolve, reject) => {
                // Add the request to the pending queue.
                this.#pendingRequests.set(request.id, { resolve, reject });
                try {
                    this.socket.send(request.payload);
                } catch (error) {
                    this.#pendingRequests.delete(request.id);
                    return reject(error);
                }
                // Set a timeout (e.g., 30 seconds) for the RPC request.
                setTimeout(() => {
                    if (this.#pendingRequests.has(request.id)) {
                        this.#pendingRequests.delete(request.id);
                        reject(new Error("RPC request timeout"));
                    }
                }, SOCKET_TIMEOUT);
            });
        } else { // Use HTTP fetch as a fallback.
            let url = request.url;
            if (url.startsWith("ws"))
                url = url.replace(/^ws/, "http");
            try {
                const response = await fetch(url, {
                    method: "POST",
                    body: request.payload,
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    }
                });
                return await response.json();
            } catch (error) {
                this.closeSocket(); // Fetch error means aria2 is offline, so close socket.
                return Promise.reject(error);
            }
        }
    }

    /**
     * Build the RPC request payload.
     * @param {string} method Aria2 RPC method.
     * @param  {...any} params Parameter list.
     * @returns {object} Request object containing id, url, and payload.
     */
    #buildRequest(method, ...params) {
        const id = this.sid;
        const request = { id, url: this.rpcUrl, payload: '' };
        if (this.secretKey) {
            params.unshift("token:" + this.secretKey);
        }
        request.payload = JSON.stringify({
            jsonrpc: "2.0",
            method: method,
            id: id,
            params: params
        });
        return request;
    }

    /**
     * Add a download task.
     * @param {string|string[]} uris Download URL or an array of URLs.
     * @param {object} options Options for the download task.
     */
    addUri(uris, options) {
        if (!Array.isArray(uris)) uris = [uris];
        const request = this.#buildRequest("aria2.addUri", uris, options);
        return this.#doRPC(request);
    }

    /**
     * Get the global status.
     */
    getGlobalStat() {
        const request = this.#buildRequest("aria2.getGlobalStat");
        return this.#doRPC(request);
    }

    /**
     * Get the file list for a task.
     * @param {string} gid Task gid.
     */
    getFiles(gid) {
        const request = this.#buildRequest("aria2.getFiles", gid);
        return this.#doRPC(request);
    }

    /**
     * Get the status of a task.
     * @param {string} gid Task gid.
     * @param {string[]} keys Status keys (optional).
     */
    tellStatus(gid, keys) {
        const request = (Array.isArray(keys) && keys.length > 0)
            ? this.#buildRequest("aria2.tellStatus", gid, keys)
            : this.#buildRequest("aria2.tellStatus", gid);
        return this.#doRPC(request);
    }

    /**
     * Change the global options.
     * @param {object} options Global options.
     */
    setGlobalOptions(options) {
        const request = this.#buildRequest("aria2.changeGlobalOption", options);
        return this.#doRPC(request);
    }
}

export default Aria2;
