import { useState, useEffect, useRef } from 'react'
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

    const [sidebarOpen, setSidebarOpen] = useState(true)

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
        localStorage.setItem('chatHistory', JSON.stringify(updatedChat))

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
                // setChatHistory((prevHistory) => [...prevHistory, { role: 'assistant', content: assistantReply }])
                const newChatHistory = [...updatedChat, { role: 'assistant', content: assistantReply }]
                setChatHistory(newChatHistory)
                localStorage.setItem('chatHistory', JSON.stringify(newChatHistory))
                setTypingText('')
            })
        } catch (error) {
            console.error("Error generating response:", error)
        }
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
        const savedChatHistory = localStorage.getItem('chatHistory')
        if (savedChatHistory) {
            setChatHistory(JSON.parse(savedChatHistory))
        }

        fetchModels()
    }, [])

    return (
        <div className="flex h-screen overflow-hidden bg-blue-500">
            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
                <div className="p-4 font-bold text-lg border-b border-gray-700 flex justify-between items-center">
                    Menu
                    <button onClick={() => setSidebarOpen(false)} className="text-sm bg-gray-700 px-2 py-1 rounded hover:bg-gray-600">
                        Hide
                    </button>
                </div>
                <div className="p-4">
                    <p className="text-gray-400">...</p>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-gray-100">
                <div className="flex items-center justify-between p-4 bg-white border-b">
                    <h1 className="text-2xl font-bold">Ollama Frontend</h1>
                    {!sidebarOpen && (
                        <button onClick={() => setSidebarOpen(true)} className="text-sm bg-gray-300 px-3 py-1 rounded hover:bg-gray-400">
                            Open Menu
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatHistory.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[60%] px-4 py-2 rounded-lg shadow ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-black'}`}>
                                {msg.content}
                            </div>
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
                        <textarea className="border rounded px-3 py-2 flex-1 h-12 resize-none bg-gray-100 text-gray-900 focus:outline-none focus:ring focus:border-blue-500" value={currentPrompt} placeholder="Type your message..." onChange={(e) => setCurrentPrompt(e.target.value)}/>
                        <button onClick={handleSendRequest} className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 rounded transition">Send</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
