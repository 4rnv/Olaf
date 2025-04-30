import { useState, useEffect, useRef, ChangeEvent } from 'react'
import { Model, ApiResponse } from './Interfaces'
import './App.css'

const App = () => {
    const [models, setModels] = useState<Model[]>([])
    const [loading, setLoading] = useState(true)
    const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([])
    const [currentPrompt, setCurrentPrompt] = useState('')
    const [currentModel, setCurrentModel] = useState('')
    const [stats, setStats] = useState('')
    const [typingText, setTypingText] = useState('')
    const [username, setUsername] = useState('Anonymous')
    const [activeChatId, setActiveChatId] = useState<string>(`olaf-session-${Date.now().toString()}`)
    const [chatSessions, setChatSessions] = useState<{ id: string, title: string }[]>([])
    const [userAvatar, setUserAvatar] = useState<string | null>(null)
    const [botAvatar, setBotAvatar] = useState<string | null>(null)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [showUsername, setShowUsername] = useState(true)
    const [showAvatars, setShowAvatars] = useState(true)
    const [settingsExpanded, setSettingsExpanded] = useState(false)
    const [activeDownloadTooltip, setActiveDownloadTooltip] = useState<string | null>(null)

    const displayTypewriter = (text: string, callback?: () => void) => {
        let i = 0
        const speed = 1
        setTypingText('')
        const typeWriter = () => {
            if (i <= text.length) {
                setTypingText(text.substring(0, i))
                i++
                setTimeout(typeWriter, speed)
            } else {
                if (callback) callback()
            }
        }
        typeWriter()
    }

    const handleSendRequest = async () => {
        const promptValue = currentPrompt.trim()
        if (!promptValue || !currentModel) {
            alert("Please enter a prompt and/or select a model.")
            return
        }
        const updatedChat = [...chatHistory, { role: 'user', content: promptValue }]
        setChatHistory(updatedChat)
        setCurrentPrompt('')
        setStats('')
        localStorage.setItem(activeChatId!, JSON.stringify(updatedChat))

        const payload = {
            model: currentModel,
            messages: updatedChat,
            stream: false
        }
        try {
            const response = await fetch("http://localhost:11434/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })
            const result = await response.json()
            const assistantReply = result.message?.content || "(No response)"
            let eval_count = result.eval_count
            let eval_duration = result.eval_duration
            if (eval_count !== undefined && eval_duration) {
                const tokenPerSec = `${((eval_count / eval_duration) * 1e9).toFixed(2)} tokens/sec`
                setStats(tokenPerSec)
            }

            displayTypewriter(assistantReply, () => {
                const newChatHistory = [...updatedChat, { role: 'assistant', content: assistantReply }]
                setChatHistory(newChatHistory)
                localStorage.setItem(activeChatId!, JSON.stringify(newChatHistory))
                setTypingText('')
            })
        } catch (error) {
            console.error("Error generating response:", error)
        }
    }

    const createNewChat = () => {
        const timestamp = Date.now()
        const newChatId = `olaf-session-${timestamp}`
        const newChatTitle = `Chat ${new Date(timestamp).toLocaleString()}`
        setChatSessions(prev => [...prev, { id: newChatId, title: newChatTitle, timestamp: timestamp }])
        setActiveChatId(newChatId)
        setStats('')
        setChatHistory([])
        setCurrentPrompt('')
        localStorage.setItem(newChatId, JSON.stringify([]))
    }

    const loadChatSession = (chatId: string) => {
        const savedChatHistory = localStorage.getItem(chatId)
        if (savedChatHistory) {
            const parsedHistory = JSON.parse(savedChatHistory)
            setChatHistory(parsedHistory)
        }
        else {
            setChatHistory([])
        }
        setActiveChatId(chatId)
        setStats('')
    }

    const deleteSession = (chatId: string) => {
        if (window.confirm(`Are you sure you want to delete session ${chatId}?`)) {
            window.localStorage.removeItem(chatId)
            setChatSessions(prev => prev.filter(item => item.id !== chatId))
        }
    }

    const deleteAllSessions = () => {
        if (window.confirm("Are you sure you want to delete all chat sessions? This action is irreversible.")) {
            Object.keys(localStorage).filter(key => key.startsWith('olaf-session-')).forEach(key => localStorage.removeItem(key))
            setChatSessions([])
            setChatHistory([])
            setActiveChatId(Date.now().toString())
        }
    }

    const formatChatAsText = (chat: { role: string, content: string }[]) =>
        chat.map(c => `${c.role.toUpperCase()}: ${c.content}`).join('\n\n')

    const formatChatAsMarkdown = (chat: { role: string, content: string }[]) =>
        chat.map(c => `### ${c.role === 'user' ? 'You' : 'Assistant'}\n\n${c.content}`).join('\n\n')

    const formatChatAsJSON = (chat: { role: string, content: string }[]) =>
        JSON.stringify(chat, null, 4)

    const downloadFile = (filename: string, content: string, type: string) => {
        const blob = new Blob([content], { type })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = filename
        link.click()
        URL.revokeObjectURL(link.href)
    }

    const handleDownload = (sessionId: string, format: string) => {
        const saved = localStorage.getItem(sessionId)
        if (!saved) {
            return
        }
        const parsed = JSON.parse(saved)
        const timestamp = sessionId.replace('olaf-session-', '')
        const filenameBase = `olaf-session-${timestamp}`
        if (format === 'txt') {
            downloadFile(`${filenameBase}.txt`, formatChatAsText(parsed), 'text/plain')
        }
        else if (format === 'md') {
            downloadFile(`${filenameBase}.md`, formatChatAsMarkdown(parsed), 'text/markdown')
        }
        else if (format === 'json') {
            downloadFile(`${filenameBase}.json`, formatChatAsJSON(parsed), 'application/json')
        }
        setActiveDownloadTooltip(null)
    }

    const handleUsername = () => {
        const input = window.prompt("Enter Username (Leave empty to remove)")
        if (input && input.trim() !== '') {
            setUsername(input.trim())
            localStorage.setItem('olaf-username', input.trim())
        }
        else {
            setUsername('Anonymous')
            localStorage.removeItem('olaf-username')
        }
    }

    const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']

    const validateFile = (file: File) => {
        if (acceptedImageTypes.includes(file.type)) {
            return true
        }
        return false
    }

    const handleBotAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0]
            if (!validateFile(file)) {
                alert("Invalid file type (use jpeg/png/gif/webp/avif)")
                return
            }
            const reader = new FileReader()
            reader.onloadend = () => {
                const base64string = reader.result as string
                setBotAvatar(base64string)
                localStorage.setItem('olaf-bot-avatar', base64string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleUserAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0]
            if (!validateFile(file)) {
                alert("Invalid file type (use jpeg/png/gif/webp/avif)")
                return
            }
            const reader = new FileReader()
            reader.onloadend = () => {
                const base64string = reader.result as string
                setUserAvatar(base64string)
                localStorage.setItem('olaf-user-avatar', base64string)
            }
            reader.readAsDataURL(file)
        }
    }

    const resetUserAvatar = () => {
        localStorage.removeItem('olaf-user-avatar')
        setUserAvatar(null)
    }

    const resetBotAvatar = () => {
        localStorage.removeItem('olaf-bot-avatar')
        setBotAvatar(null)
    }

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const response = await fetch("http://localhost:11434/api/tags")
                const data: ApiResponse = await response.json()
                setModels(data.models)
                if (data.models.length > 0) {
                    const savedModel = localStorage.getItem('selectedModel')
                    setCurrentModel(savedModel || data.models[0].model)
                }
            } catch (error) {
                console.error("Error fetching models:", error)
                alert("No models found. Make sure Ollama is active in the background.")
            } finally {
                setLoading(false)
            }
        }

        const savedChatSessions = Object.keys(localStorage)
            .filter(key => key.startsWith('olaf-session-'))
            .map(key => {
                const timestamp = key.replace('olaf-session-', '')
                return {
                    id: key,
                    title: `Chat ${new Date(parseInt(timestamp)).toLocaleString()}`,
                    timestamp: parseInt(timestamp)
                }
            }).sort((a, b) => b.timestamp - a.timestamp)
        console.log('Saved Chat Sessions: ', savedChatSessions)
        setChatSessions(savedChatSessions)
        if (savedChatSessions.length > 0) {
            loadChatSession(savedChatSessions[0].id)
        } else {
            console.log("No chats loaded")
            setChatHistory([])
        }

        const savedUsername = localStorage.getItem('olaf-username')
        if (savedUsername) {
            setUsername(savedUsername)
        }
        else {
            setUsername('Anonymous')
        }

        const savedUserAvatar = localStorage.getItem('olaf-user-avatar')
        const savedBotAvatar = localStorage.getItem('olaf-bot-avatar')
        if (savedUserAvatar) setUserAvatar(savedUserAvatar)
        if (savedBotAvatar) setBotAvatar(savedBotAvatar)

        fetchModels()
    }, [])

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
                <div className="p-4 font-bold text-lg border-b border-gray-700 flex justify-between items-center">Olaf
                    <button onClick={() => setSidebarOpen(false)} className="text-sm bg-gray-700 px-2 py-1 hover:bg-gray-600">
                        Hide
                    </button>
                </div>
                <div className="p-4 h-[100%] flex flex-col content-between justify-between items-stretch">
                    <div>
                        <button onClick={createNewChat} className="w-full bg-gray-600 hover:bg-pink-700 text-white font-semibold px-4 py-2 mb-2">New Chat</button>
                        <h2 className="text-lg font-semibold">History</h2>
                        <ul className="mt-2 relative">
                            {chatSessions.map(session => (
                                <li key={session.id} className="cursor-pointer hover:bg-gray-700 p-2 rounded text-sm" onClick={() => loadChatSession(session.id)}>{session.title}
                                    <button className="ml-2 text-xs text-blue-500 hover:bg-blue-500 hover:cursor-pointer hover:text-white p-1" onClick={(e) => {
                                        e.preventDefault()
                                        setActiveDownloadTooltip(prev => prev === session.id ? null : session.id)
                                    }}>Export</button>
                                    <button onClick={() => deleteSession(session.id)} className="ml-2 text-xs text-red-500 hover:bg-red-800 hover:cursor-pointer hover:text-white p-1">Delete</button>
                                    {activeDownloadTooltip === session.id && (
                                        <div className="right-0 bottom-10 bg-gray-600 text-white text-sm rounded shadow mt-1 z-10">
                                            <button onClick={() => handleDownload(session.id, 'txt')} className="btn-tooltip">TXT</button>
                                            <button onClick={() => handleDownload(session.id, 'md')} className="btn-tooltip">Markdown</button>
                                            <button onClick={() => handleDownload(session.id, 'json')} className="btn-tooltip">JSON</button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div id="settings" className="flex flex-col">
                        <button onClick={() => setSettingsExpanded(!settingsExpanded)} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 mt-4 flex justify-between items-center">Settings {settingsExpanded ? "▼" : "▲"}</button>
                        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${settingsExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                            <div className="flex flex-col gap-2 mt-4">
                                <button onClick={handleUsername} className="btn-settings">Set Username</button>
                                <button onClick={() => setShowUsername(prev => !prev)} className="btn-settings">{showUsername ? "Hide Username" : "Show Username"}</button>
                                <label className="btn-upload">Upload User Avatar<input type="file" accept="image/*" onChange={handleUserAvatarUpload} className="hidden" /></label>
                                <label className="btn-upload">Upload Bot Avatar<input type="file" accept="image/*" onChange={handleBotAvatarUpload} className="hidden" /></label>
                                <button onClick={() => setShowAvatars(prev => !prev)} className="btn-settings">{showAvatars ? "Hide Avatars" : "Show Avatars"}</button>
                                <button onClick={resetUserAvatar} className="btn-settings">Reset User Avatar</button>
                                <button onClick={resetBotAvatar} className="btn-settings">Reset Bot Avatar</button>
                                <button onClick={deleteAllSessions} className="btn-danger">Delete All Sessions</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-gray-100">
                <div className="flex items-center justify-between p-4 bg-white border-b">
                    {showUsername && (
                        <h2 className="text-2xl font-light">Hello, {username ? username : 'Anonymous'}</h2>
                    )}
                    {!sidebarOpen && (
                        <button onClick={() => setSidebarOpen(true)} className="text-sm bg-gray-300 px-3 py-1 rounded hover:bg-gray-400">
                            Open Menu
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {Array.isArray(chatHistory) && chatHistory!.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                            {showAvatars && msg.role === 'assistant' && (<img src={botAvatar || "/bot-avatar.png"} alt="Bot" className="w-16 h-16 border-black border rounded-4xl" />)}

                            <div className={`max-w-[60%] px-4 py-2 rounded-lg shadow ${msg.role === 'user' ? 'bg-gray-500 text-white' : 'bg-gray-300 text-black'}`}>
                                {msg.content}
                            </div>

                            {showAvatars && msg.role === 'user' && (<img src={userAvatar || "/user-avatar.png"} alt="(You)" className="w-16 h-16 border-black border rounded-full" />)}
                        </div>
                    ))}

                    {typingText && (
                        <div className="flex justify-start">
                            <div className="max-w-[60%] px-4 py-2 rounded-lg shadow bg-gray-300 text-black">
                                {typingText}
                            </div>
                        </div>
                    )}
                </div>
                <div className="text-gray-500 text-xs mt-1">{stats}</div>

                {/* Footer */}
                <div className="border-t p-2 bg-white flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <select className="border rounded px-3 h-12 bg-gray-100 text-gray-900 focus:outline-none focus:ring focus:border-blue-500" value={currentModel} onChange={(e) => {
                            const selectedModel = e.target.value
                            setCurrentModel(selectedModel)
                            localStorage.setItem('selectedModel', selectedModel)
                        }} >
                            {loading ? (
                                <option>Loading models...</option>
                            ) : (
                                models.map((model) => (
                                    <option key={model.model} value={model.model}>{model.name}</option>
                                ))
                            )}
                        </select>
                        <textarea className="border rounded px-3 py-2 flex-1 h-12 resize-none bg-gray-100 text-gray-900 focus:outline-none focus:ring focus:border-blue-500" value={currentPrompt} placeholder="Type your message..." onChange={(e) => setCurrentPrompt(e.target.value)} />
                        <button onClick={handleSendRequest} className="h-12 bg-gray-600 hover:bg-pink-700 text-white font-semibold px-6 rounded transition">Send</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
