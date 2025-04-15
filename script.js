// Debug logging function
function debugLog(message, data = null) {
    console.log(message, data);
    const debugInfo = document.getElementById('debug-info');
    const entry = document.createElement('div');
    entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    if (data) {
        entry.textContent += ` - ${JSON.stringify(data)}`;
    }
    debugInfo.appendChild(entry);
    debugInfo.scrollTop = debugInfo.scrollHeight;
}

// Initialize Supabase properly
const { createClient } = supabase;
const SUPABASE_URL = 'https://zytziiucuiitksovhaqg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5dHppaXVjdWlpdGtzb3ZoYXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MjI5MjYsImV4cCI6MjA2MDI5ODkyNn0.oO0LuMRI9jnXHkeEtpWLgt9HsMblusLAzfhI1c5No5M';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
let currentUser = null;

// Test Supabase connection
async function testConnection() {
    try {
        const { data, error } = await supabaseClient
            .from('messages')
            .select('*')
            .limit(1);

        if (error) throw error;
        return true;
    } catch (error) {
        return false;
    }
}

// Initialize the application
async function initializeApp() {
    const connected = await testConnection();
    if (!connected) return;

    // Set up real-time test channel
    const channel = supabaseClient.channel('test')
        .on('broadcast', { event: 'test' }, () => {})
        .subscribe();
}

// Call initialization
initializeApp();

async function joinChat() {
    const username = document.getElementById('username').value.trim();
    if (!username) return;

    currentUser = username;
    document.getElementById('login').classList.add('hidden');
    document.getElementById('chat').classList.remove('hidden');

    try {
        // Load previous messages
        const { data: messages, error } = await supabaseClient
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        messages.forEach(displayMessage);

        // Set up real-time subscription
        const channel = supabaseClient
            .channel('public:messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                displayMessage(payload.new);
            })
            .subscribe();

    } catch (error) {
        return;
    }

    document.getElementById('message').focus();
}

// Add event listener for file input
document.getElementById('file-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('preview-image');
            const previewContainer = document.getElementById('image-preview');
            preview.src = e.target.result;
            previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

function clearImage() {
    document.getElementById('file-upload').value = '';
    document.getElementById('preview-image').src = '';
    document.getElementById('image-preview').classList.add('hidden');
}

async function sendMessage() {
    const text = document.getElementById('message').value.trim();
    const file = document.getElementById('file-upload').files[0];
    
    if (!text && !file) return;
    
    try {
        let imageUrl = null;
        if (file) {
            // Show loading state
            const previewContainer = document.getElementById('image-preview');
            previewContainer.classList.add('uploading');
            
            const fileName = `chat_images/${Date.now()}_${file.name}`;
            const { data, error } = await supabaseClient.storage
                .from('chat_images')
                .upload(fileName, file);
            
            if (error) throw error;
            
            imageUrl = supabaseClient.storage
                .from('chat_images')
                .getPublicUrl(data.path).data.publicUrl;
        }

        await supabaseClient
            .from('messages')
            .insert({ 
                username: currentUser,
                message: text,
                image_url: imageUrl 
            });
        
        // Clear inputs
        document.getElementById('message').value = '';
        clearImage();
        
    } catch (error) {
        console.error('Error sending message:', error);
        return;
    }
}

function displayMessage(msg) {
    const messagesContainer = document.getElementById('messages-container');
    const isCurrentUser = msg.username === currentUser;
    const time = new Date(msg.created_at).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isCurrentUser ? 'own' : 'other'}`;
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'meta';
    
    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'username';
    usernameSpan.textContent = msg.username;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = time;
    
    metaDiv.appendChild(usernameSpan);
    metaDiv.appendChild(timeSpan);
    messageDiv.appendChild(metaDiv);
    
    if (msg.message) {
        const textDiv = document.createElement('div');
        textDiv.className = 'text';
        textDiv.textContent = msg.message;
        messageDiv.appendChild(textDiv);
    }
    
    if (msg.image_url) {
        const img = document.createElement('img');
        img.src = msg.image_url;
        img.className = 'chat-image';
        img.loading = 'lazy';
        img.alt = 'User upload';
        messageDiv.appendChild(img);
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Handle Enter key for sending messages
document.getElementById('message').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
}); 