import { useState, useEffect, useRef, ChangeEvent } from 'react'
import Markdown from 'markdown-to-jsx'
import { Trash2, FileDown, PenTool, ImagePlus, Earth, SidebarClose, MessageCirclePlus, SidebarOpen, SendHorizonal, Layers } from "lucide-react"
import { UserX, BotIcon, EyeOff, Eye, BotOff, UserPlus } from "lucide-react"
import { Model, ApiResponse, ImageResponse, ImageGenOverlayProps } from './Interfaces'
import './App.css'

const ImageGenOverlay = ({ isOpen, onClose }: ImageGenOverlayProps) => {
    const [prompt, setPrompt] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedImage, setGeneratedImage] = useState<ImageResponse | null>(null)

    const handleGenerate = async () => {
        if (!prompt.trim()) return

        setIsGenerating(true)
        try {
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&nologo=true&private=true`

            const img = new Image()
            img.onload = () => {
                const newImage = {
                    prompt: prompt,
                    url: imageUrl,
                    timestamp: Date.now()
                }
                setGeneratedImage(newImage)
                setIsGenerating(false)
                setPrompt('')
            }
            img.onerror = () => {
                console.error('Image generation failed')
                setIsGenerating(false)
            }
            img.src = imageUrl
        } catch (error) {
            console.error('Image generation error:', error)
            setIsGenerating(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-secondary w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6">
                    <h3 className="text-xl font-semibold text-text">
                        Image Generation
                    </h3>
                    <button
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1"
                        onClick={onClose}
                    >
                        X
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                    <div className="flex gap-4 mb-6">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe your image"
                            className="flex-1 px-4 py-3 border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        />
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt.trim()}
                            className="px-6 py-3 bg-accent text-white font-medium hover:bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isGenerating ? 'Generating...' : 'Generate Image'}
                        </button>
                    </div>

                    {generatedImage && (
                        <div className="border border-gray-200 bg-white overflow-hidden">
                            <img
                                src={generatedImage.url}
                                alt={generatedImage.prompt}
                                className="p-4 w-full h-auto max-h-96 object-contain"
                            />
                            <div className="px-4 py-2">
                                <p className="text-sm text-gray-600 mb-4">
                                    {generatedImage.prompt}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => window.open(generatedImage.url, '_blank')}
                                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                    >
                                        Open Full Size
                                    </button>
                                    <button
                                        onClick={() => {
                                            const link = document.createElement('a')
                                            link.href = generatedImage.url
                                            link.target = '_blank'
                                            link.download = `${generatedImage.prompt}.png`
                                            link.click()
                                        }}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

const App = () => {
    const [models, setModels] = useState<Model[]>([])
    const [loading, setLoading] = useState(true)
    const [replying, setReplying] = useState(false)
    const [chatHistory, setChatHistory] = useState<{ role: string, content: string, webSearch?: boolean }[]>([])
    const [currentPrompt, setCurrentPrompt] = useState('')
    const [currentModel, setCurrentModel] = useState('')
    const [stats, setStats] = useState('')
    const [typingText, setTypingText] = useState('')
    const [activeChatId, setActiveChatId] = useState<string>(`olaf-session-${Date.now().toString()}`)
    const [chatSessions, setChatSessions] = useState<{ id: string, title: string }[]>([])
    const [userAvatar, setUserAvatar] = useState<string | null>(null)
    const [botAvatar, setBotAvatar] = useState<string | null>(null)
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)
    const [showAvatars, setShowAvatars] = useState<boolean>(true)
    const [settingsExpanded, setSettingsExpanded] = useState(false)
    const [activeDownloadTooltip, setActiveDownloadTooltip] = useState<string | null>(null)
    const [theme, setTheme] = useState<string>(() => localStorage.getItem('olaf-theme') || 'base')
    const [quoteText, setQuoteText] = useState<string | null>(null)
    const [quotePos, setQuotePos] = useState<{ x: number, y: number } | null>(null)
    const quoteRangeRef = useRef<Range | null>(null)
    const [webSearch, setWebSearch] = useState<boolean>(false)
    const [showImageGenOverlay, setShowImageGenOverlay] = useState(false)
    const [showToolsDropdown, setShowToolsDropdown] = useState(false)
    const [showModelDropdown, setShowModelDropdown] = useState(false)

    useEffect(() => {
        document.documentElement.classList.remove('theme-pink', 'theme-orange', 'theme-sky')
        if (theme !== 'base') {
            document.documentElement.classList.add(`theme-${theme}`)
        }
        localStorage.setItem('olaf-theme', theme)
    }, [theme])

    const displayTypewriter = (text: string, callback?: () => void) => {
        const totalChunks = 10
        const timeout = 100
        const chunkSize = Math.ceil(text.length / totalChunks)
        let currentChunk = 1
        setTypingText('')
        const typeWriter = () => {
            if (currentChunk <= totalChunks) {
                const endIndex = Math.min(currentChunk * chunkSize, text.length)
                setTypingText(text.substring(0, endIndex))
                currentChunk++
                setTimeout(typeWriter, timeout)
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
        setReplying(true)
        localStorage.setItem(activeChatId!, JSON.stringify(updatedChat))

        let finalMessages = updatedChat

        if (webSearch) {
            try {
                const searchResults = await performWebSearch(promptValue)
                const formattedSearchResults = searchResults.map((r: any, i: number) => `${i + 1}. ${r.title}: ${r.body}`).join('\n')
                console.log(formattedSearchResults)

                const systemMessage = {
                    role: 'system',
                    content: `You are a helpful assistant. You have been provided up-to-date web search results. Use only this information to answer the user's question.`
                }
                const infoWebMessage = {
                    role: 'user',
                    content:
                        `Web Search Results:\n${formattedSearchResults}\n\nQuestion: ${promptValue}\n\nAnswer using only the search results above.`
                }

                // Insert system message before user's message
                finalMessages = [
                    ...updatedChat.slice(0, -1),
                    systemMessage,
                    infoWebMessage,
                    { role: 'user', content: promptValue }
                ]

                const searchIndicator = {
                    role: 'system',
                    content: `Web search performed for: "${promptValue}"`,
                    webSearch: true
                }
                setChatHistory([...updatedChat, searchIndicator])

            } catch (error) {
                console.error('Web search failed:', error)
            }
        }

        const payload = {
            model: currentModel,
            messages: finalMessages.map(({ role, content }) => ({ role, content })),
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
            const eval_count = result.eval_count
            const eval_duration = result.eval_duration
            if (eval_count !== undefined && eval_duration) {
                const tokenPerSec = `${((eval_count / eval_duration) * 1e9).toFixed(2)} tokens/sec`
                setStats(tokenPerSec)
            }

            displayTypewriter(assistantReply, () => {
                const finalChatHistory = webSearch
                    ? [...updatedChat, { role: 'assistant', content: assistantReply, webSearch: true }]
                    : [...updatedChat, { role: 'assistant', content: assistantReply, webSearch: false }]

                setChatHistory(finalChatHistory)
                localStorage.setItem(activeChatId!, JSON.stringify(finalChatHistory))
                setTypingText('')
                setReplying(false)
            })
        } catch (error) {
            console.error("Error generating response:", error)
        }
    }

    const performWebSearch = async (query: string) => {
        try {
            const response = await fetch(`http://localhost:5000/api/search?q=latest%20${encodeURIComponent(query)}`)
            if (!response.ok) throw new Error("Search API failed")
            const data = await response.json()
            console.log(data)
            return data.results
        } catch (err) {
            console.error('Web search error:', err)
            return []
        }
    }

    const createNewChat = () => {
        const timestamp = Date.now()
        const newChatId = `olaf-session-${timestamp}`
        const newChatTitle = `Chat ${new Date(timestamp).toLocaleString()}`
        setChatSessions(prev => [...prev, { id: newChatId, title: newChatTitle }])
        setActiveChatId(newChatId)
        setStats('')
        setChatHistory([])
        setCurrentPrompt('')
        setQuoteText(null)
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
        setQuoteText(null)
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

        const savedUserAvatar = localStorage.getItem('olaf-user-avatar')
        const savedBotAvatar = localStorage.getItem('olaf-bot-avatar')
        if (savedUserAvatar) setUserAvatar(savedUserAvatar)
        if (savedBotAvatar) setBotAvatar(savedBotAvatar)

        fetchModels()
    }, [])

    useEffect(() => {
        const handleSelection = (e: MouseEvent) => {
            const selection = window.getSelection()
            if (!selection || selection.rangeCount === 0) {
                setQuoteText(null)
                return
            }
            const text = selection.toString().trim()
            const range = selection.getRangeAt(0)
            quoteRangeRef.current = range.cloneRange()

            if (text) {
                const rect = range.getBoundingClientRect()
                setQuoteText(text)
                setQuotePos({ x: rect.left + window.scrollX, y: rect.top + window.scrollY - 20 })
                setTimeout(() => {
                    const sel = window.getSelection()
                    if (quoteRangeRef.current) {
                        sel?.removeAllRanges()
                        sel?.addRange(quoteRangeRef.current)
                    }
                }, 0)
            } else {
                setQuoteText(null)
            }
        }

        document.addEventListener('mouseup', handleSelection)
        return () => document.removeEventListener('mouseup', handleSelection)
    }, [])

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-secondary text-white transition-all duration-300 flex flex-col`}>
                <div className="p-4 font-bold text-lg flex justify-between items-center">
                    <span>Olaf</span>
                    <MessageCirclePlus onClick={createNewChat} className="hover:text-hover" />
                    <SidebarClose onClick={() => setSidebarOpen(false)} className="hover:text-hover" />
                </div>
                <div className="p-4 pt-0 h-[100%] flex flex-col content-between justify-between items-stretch">
                    <div>
                        <h2 className="text-lg font-semibold">History</h2>
                        <ul className="mt-2 max-h-[40vh] overflow-y-auto">
                            {chatSessions.map(session => (
                                <li key={session.id} className={`cursor-pointer hover:bg-hover p-2 text-sm ${activeChatId === session.id ? 'font-bold bg-accent' : ''}`} onClick={() => loadChatSession(session.id)}>
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="flex-1 truncate cursor-pointer" onClick={() => loadChatSession(session.id)}>
                                            {new Date(session.title).toLocaleString("en-GB")}
                                        </span>
                                        <div className="flex gap-2 items-center">

                                            <button className=" text-xs text-gray-300 hover:bg-blue-500 hover:cursor-pointer p-1" onClick={(e) => {
                                                e.preventDefault()
                                                setActiveDownloadTooltip(prev => prev === session.id ? null : session.id)
                                            }} title='Export Chat'><FileDown size={20} /></button>
                                            <button onClick={() => deleteSession(session.id)} className="text-xs text-gray-300 hover:cursor-pointer hover:bg-red-500 p-1" title='Delete'><Trash2 size={20} /></button>
                                        </div>
                                    </div>
                                    {activeDownloadTooltip === session.id && (
                                        <div className="right-0 bottom-10 bg-gray-600 text-white text-sm shadow mt-1 z-10">
                                            <button onClick={() => handleDownload(session.id, 'txt')} className="btn-tooltip">TXT</button>
                                            <button onClick={() => handleDownload(session.id, 'md')} className="btn-tooltip">Markdown</button>
                                            <button onClick={() => handleDownload(session.id, 'json')} className="btn-tooltip">JSON</button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div id="settings" className="mt-4 max-h-[40vh] overflow-y-auto">
                        <button onClick={() => setSettingsExpanded(!settingsExpanded)} className="w-full btn-settings flex justify-between">Settings {settingsExpanded ? "▼" : "▲"}</button>

                        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${settingsExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}>
                            {/* THEME SECTION */}
                            <div className="pt-4">
                                <h3 className="text-sm font-semibold mb-1">Theme</h3>
                                <select value={theme} onChange={e => setTheme(e.target.value)} className="w-full px-3 py-2 bg-gray-100 text-black">
                                    <option value="base">Default</option>
                                    <option value="pink">Makinami</option>
                                    <option value="orange">Shikinami</option>
                                    <option value="sky">Ayanami</option>
                                </select>
                            </div>

                            {/* AVATAR SETTINGS */}
                            <div className="pt-4">
                                <h3 className="text-sm font-semibold mb-1">Avatars</h3>

                                <div className="grid grid-cols-3 gap-1 mt-2 px-12 py-0">
                                    {/* Upload User Avatar */}
                                    <label
                                        title="Upload User Avatar"
                                        className="border-3 border-dashed border-cyan-500 cursor-pointer flex items-center justify-center bg-transparent hover:bg-hover aspect-square"
                                    >
                                        <UserPlus size={20} className="text-white" />
                                        <input type="file" accept="image/*" onChange={handleUserAvatarUpload} className="hidden" />
                                    </label>

                                    {/* Reset User Avatar */}
                                    <button
                                        onClick={resetUserAvatar}
                                        title="Reset User Avatar"
                                        className="border-3 border-dashed border-cyan-500 flex items-center justify-center bg-transparent hover:bg-hover aspect-square"
                                    >
                                        <UserX size={20} className="text-white" />
                                    </button>

                                    {/* Upload Bot Avatar */}
                                    <label
                                        title="Upload Bot Avatar"
                                        className="border-3 border-dashed border-lime-500 cursor-pointer flex items-center justify-center bg-transparent hover:bg-hover aspect-square"
                                    >
                                        <BotIcon size={20} className="text-white" />
                                        <input type="file" accept="image/*" onChange={handleBotAvatarUpload} className="hidden" />
                                    </label>

                                    {/* Reset Bot Avatar */}
                                    <button
                                        onClick={resetBotAvatar}
                                        title="Reset Bot Avatar"
                                        className="border-3 border-dashed border-lime-500 flex items-center justify-center bg-transparent hover:bg-hover aspect-square"
                                    >
                                        <BotOff size={20} className="text-white" />
                                    </button>

                                    {/* Toggle Avatar Visibility */}
                                    <button
                                        onClick={() => setShowAvatars(prev => !prev)}
                                        title={showAvatars ? "Hide Avatars" : "Show Avatars"}
                                        className="border-3 border-dashed border-yellow-200 flex items-center justify-center bg-transparent hover:bg-hover aspect-square"
                                    >
                                        {showAvatars ? (
                                            <EyeOff size={20} className="text-white" />

                                        ) : (
                                            <Eye size={20} className="text-white" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* DANGER ZONE */}
                            <div className="mt-4">
                                <h3 className="text-sm font-semibold text-red-400 mb-1">Danger Zone</h3>
                                <button onClick={deleteAllSessions} className="btn-danger">Delete All Sessions</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white justify-evenly">
                <div className="flex items-center justify-start p-4 gap-1">
                    {!sidebarOpen && (
                        <SidebarOpen onClick={() => setSidebarOpen(true)} className="hover:text-hover" />
                    )}
                    <div className="text-gray-500 text-sm mt-1">{stats}</div>
                </div>

                <div className="flex-1 overflow-y-auto pb-20 pt-10 px-12 space-y-4">
                    {Array.isArray(chatHistory) && chatHistory!.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                            {showAvatars && msg.role === 'assistant' && (<img src={botAvatar || "/bot-avatar.png"} alt="Bot" className="w-16 h-16 rounded-img" />)}
                            <div className="relative max-w-[60%]">
                                {msg.webSearch && (
                                    <span className="absolute top-[-10px] left-[-10px] z-10">
                                        <Earth color="#444" size={24} />
                                    </span>
                                )}
                                <div className={`px-4 py-2 shadow ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-gray-200 text-black bot-message'}`}>
                                    {/* {msg.content} */}
                                    {msg.role === 'user' ? msg.content : (
                                        <Markdown
                                            options={
                                                {
                                                    overrides: {
                                                        code: {
                                                            props: {
                                                                className: 'bg-gray-200 text-accent px-1 py-0.5 font-mono text-sm',
                                                            },
                                                        },
                                                        pre: {
                                                            props: {
                                                                className: 'bg-gray-200 text-gray-100 rounded p-3 my-2 overflow-x-auto  wrap-break-word text-wrap'
                                                            },
                                                        },
                                                        blockquote: {
                                                            props: {
                                                                className: 'border-l-4 border-gray-400 bg-white-50 pl-4 py-2 my-3 italic',
                                                            },
                                                        },
                                                        ul: {
                                                            props: {
                                                                className: 'list-disc list-inside pl-5 my-2',
                                                            },
                                                        },
                                                        ol: {
                                                            props: {
                                                                className: 'list-decimal list-inside pl-5 my-2',
                                                            },
                                                        },
                                                        li: {
                                                            props: {
                                                                className: 'mb-1',
                                                            },
                                                        },
                                                    },
                                                }
                                            }
                                        >
                                            {msg.content}
                                        </Markdown>
                                    )
                                    }
                                </div>
                            </div>

                            {showAvatars && msg.role === 'user' && (<img src={userAvatar || "/user-avatar.png"} alt="(You)" className="w-16 h-16 rounded-img" />)}
                        </div>
                    ))}
                    {replying && (<img src="/spinner.gif" alt="Loading reply" className='w-16 h-16' />)}
                    {typingText && (
                        <div className="flex justify-start">
                            <div className="max-w-[60%] px-4 py-2 shadow bg-gray-300 text-black">
                                {typingText}
                            </div>
                        </div>
                    )}
                    {quoteText && quotePos && (
                        <div
                            className="font-serif absolute z-50 bg-accent text-gray-200 px-2 py-1 hover:bg-hover text-md shadow cursor-pointer"
                            style={{
                                position: 'absolute',
                                left: quotePos.x,
                                top: quotePos.y,
                            }}
                            onMouseDown={e => e.stopPropagation()}
                            onMouseUp={e => e.stopPropagation()}
                            onClick={() => {
                                setCurrentPrompt(prev => `> ${quoteText}\n${prev}`)
                                setQuoteText(null)
                                window.getSelection()?.removeAllRanges()
                            }}
                        >
                            Ask {currentModel}
                        </div>
                    )}
                </div>

                {/* Footer */}
                < div className="relative bottom-8 w-full z-50 px-30 max-h-[25vh]" >
                    <div className="bg-gray-100 shadow-md border border-gray-300 w-full flex flex-col items-center p-4 gap-4">
                        {/* Textarea */}
                        <textarea
                            required
                            className="w-full h-24 px-4 py-3 bg-gray-100 text-black resize-none focus:outline-none focus:ring-2 focus:border-accent"
                            placeholder="Type your message..."
                            value={currentPrompt}
                            onChange={(e) => setCurrentPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSendRequest()
                                }
                            }}
                        />
                        <div className="w-full flex justify-between items-center">
                            <div className="flex flex-row gap-1">
                                <div className="relative">
                                    <button
                                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                                        className="text-gray-700 hover:text-accent cursor-pointer focus:outline-none"
                                    >
                                        <Layers size={24} />
                                    </button>
                                    {showModelDropdown && (
                                        <div className="absolute bottom-full mb-2 left-0 w-40 bg-white border border-gray-300 shadow-lg text-sm z-10">
                                            {loading ? (
                                                <div className="p-2 text-gray-500">Loading models...</div>
                                            ) : (
                                                models.map((model) => (
                                                    <button
                                                        key={model.model}
                                                        className={`w-full px-4 py-2 text-left hover:bg-secondary hover:text-gray-300 ${currentModel === model.model ? 'bg-primary font-semibold text-gray-300' : ''
                                                            }`}
                                                        onClick={() => {
                                                            setCurrentModel(model.model)
                                                            localStorage.setItem('selectedModel', model.model)
                                                            setShowModelDropdown(false)
                                                        }}
                                                    >
                                                        {model.name}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div>{currentModel}</div>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                                        className="text-gray-700 hover:text-accent focus:outline-none"
                                    >
                                        <PenTool size={24} />
                                    </button>
                                    {showToolsDropdown && (
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-white border border-gray-300 shadow-lg z-10">
                                            <button
                                                onClick={() => {
                                                    setShowImageGenOverlay(true)
                                                    setShowToolsDropdown(false)
                                                }}
                                                className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-200"
                                            >
                                                <ImagePlus size={18} />
                                                <span>Image Generation</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setWebSearch(!webSearch)
                                                    setShowToolsDropdown(false)
                                                }}
                                                className={`w-full px-4 py-2 text-left flex items-center gap-2 ${webSearch ? 'bg-gray-100' : 'hover:bg-gray-200'
                                                    }`}
                                            >
                                                <Earth size={18} />
                                                <span>Web Search</span>
                                                {webSearch && (
                                                    <span className="ml-auto text-xs bg-green-800 text-white px-2 py-0.5">ON</span>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Send Button */}
                            <button
                                onClick={() => {
                                    handleSendRequest
                                    setReplying(true)
                                }}
                                className="text-gray-700 hover:text-accent focus:outline-none"
                            >
                                <SendHorizonal size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {showImageGenOverlay && (
                <ImageGenOverlay
                    isOpen={showImageGenOverlay}
                    onClose={() => setShowImageGenOverlay(false)}
                />
            )}

        </div>
    )
}

export default App
