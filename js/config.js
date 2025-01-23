export const DefaultAriaNgOptions = {
    language: 'TBD',
    theme: 'system',
    title: '${downspeed}, ${upspeed} - ${title}',
    titleRefreshInterval: 5000,
    browserNotification: false,
    browserNotificationSound: true,
    browserNotificationFrequency: 'unlimited',
    rpcAlias: 'Aria2',
    rpcHost: 'localhost',
    rpcPort: '6800',
    rpcInterface: 'jsonrpc',
    protocol: 'ws',
    httpMethod: 'POST',
    rpcRequestHeaders: '',
    rpcOptions: {},
    secret: '',
    extendRpcServers: [],
    webSocketReconnectInterval: 5000,
    globalStatRefreshInterval: 1000,
    downloadTaskRefreshInterval: 1000,
    keyboardShortcuts: false,
    swipeGesture: true,
    dragAndDropTasks: true,
    rpcListDisplayOrder: 'recentlyUsed',
    afterCreatingNewTask: 'task-list',
    removeOldTaskAfterRetrying: true,
    confirmTaskRemoval: true,
    includePrefixWhenCopyingFromTaskDetails: false,
    showPiecesInfoInTaskDetailPage: 'le10240',
    afterRetryingTask: 'task-list-default',
    displayOrder: 'default:asc',
    fileListDisplayOrder: 'default:asc',
    peerListDisplayOrder: 'default:asc'
}

export const DefaultConfigs = {
    ariaNgOptions: DefaultAriaNgOptions,
    contextMenus: true,
    askBeforeExport: false,
    exportAll: true,
    integration: false,
    fileSize: "100",
    askBeforeDownload: false,
    allowExternalRequest: false,
    monitorAria2: false,
    monitorAll: false,
    keepAwake: false,
    badgeText: true,
    allowNotification: false,
    keepSilent: false,
    captureMagnet: false,
    remindCaptureTip: true,
    rpcList: [{ "name": "Aria2", "url": "http://localhost:6800/jsonrpc", "pattern": "" }],
    webUIOpenStyle: "window",
    colorModeId: 2,
    allowedSites: [],
    blockedSites: [],
    allowedExts: [],
    blockedExts: []
};

export default DefaultConfigs;
