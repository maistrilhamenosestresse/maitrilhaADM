const { readdirSync, statSync, writeFileSync, existsSync, readFileSync } = require('fs');
const { join, extname } = require('path');

const IMAGES_DIR = join(__dirname, 'imagens');
const OUTPUT_FILE = join(__dirname, 'ai_gallery_data.js');

const PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const VIDEO_EXTS = ['.mp4', '.mov', '.avi'];

const API_KEY = process.env.DASHSCOPE_API_KEY || 'sk-3e9ab9da24884ea5b477fa58000b98b4';

// Sleep helper
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function classifyImageBase64(fullPath, mimeType) {
    try {
        const fileData = readFileSync(fullPath);
        const base64Str = fileData.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Str}`;

        const requestBody = {
            model: "qwen-vl-plus",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Analyze this image. Reply strictly with ONE word ONLY from these options: 'REJECT' (if people have closed eyes, ugly expressions, grimaces, or very blurry), 'PEOPLE' (if it shows people fine), 'LANDSCAPE' (if nature/waterfall without clear prominent people)." },
                        { type: "image_url", image_url: { url: dataUrl } }
                    ]
                }
            ],
            max_tokens: 10,
            temperature: 0.1
        };

        const res = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
            const errBody = await res.text();
            console.error(`🔴 Qwen API Error: ${res.status}`, errBody.substring(0, 200));
            return "ERROR";
        }

        const data = await res.json();
        const rawReply = data.choices && data.choices[0] && data.choices[0].message.content;
        if (!rawReply) return "ERROR";
        
        let cleaned = rawReply.replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (cleaned.includes("REJECT")) return "REJECT";
        if (cleaned.includes("PEOPLE")) return "PEOPLE";
        if (cleaned.includes("LANDSCAPE")) return "LANDSCAPE";
        
        return "UNKNOWN";
    } catch (err) {
        console.error("🔴 Fatal Fetch/Read Error:", err.message);
        return "ERROR";
    }
}

async function run() {
    console.log("🚀 Iniciando processamento IA...");
    
    const gallery = { trails: {}, videos: [], categories: { landscape: [], people: [] }, allPhotos: [] };
    
    // Check files
    const allFiles = [];
    
    function explore(dirPath, trailName) {
        const items = readdirSync(dirPath);
        for (const item of items) {
            const full = join(dirPath, item);
            if (statSync(full).isDirectory()) {
                explore(full, trailName || item);
            } else {
                const ext = extname(item).toLowerCase();
                const relPath = full.replace(__dirname + '\\', '').replace(/\\/g, '/');
                if (PHOTO_EXTS.includes(ext)) {
                    allFiles.push({ path: relPath, fullPath: full, trail: trailName||'Diversos', name: item, ext });
                } else if (VIDEO_EXTS.includes(ext)) {
                    gallery.videos.push({ path: relPath, trail: trailName||'Diversos', name: item });
                }
            }
        }
    }

    explore(IMAGES_DIR, null);
    console.log(`📸 Encontradas ${allFiles.length} fotos e ${gallery.videos.length} videos.`);
    
    // Vamos processar no máximo 40 por ser pesado e demorado demais o encoding de imgs de 15MB.
    // Vamos mesclar fallback aleatório pras que derem erro pra evitar que o site fique vazio.
    let count = 0;
    
    for (const file of allFiles) {
        count++;
        console.log(`[${count}/${allFiles.length}] Processando: ${file.name}`);
        
        // Pule arquivos .ini. Tenta identificar mimetype
        let mime = 'image/jpeg';
        if (file.ext === '.png') mime = 'image/png';
        else if (file.ext === '.webp') mime = 'image/webp';
        else if (file.ext === '.gif') mime = 'image/gif';
        
        // Pula arquivos bizarros
        if (statSync(file.fullPath).size > 15000000) {
            console.log("⏩ Pulando, > 15MB (Demasiado grande pra API)");
            gallery.allPhotos.push(file);
            gallery.categories.people.push(file); // Default safe route
            continue;
        }

        let classification = await classifyImageBase64(file.fullPath, mime);
        
        if (classification === 'ERROR' || classification === 'UNKNOWN') {
            // Em caso de erro na IA ou timeout, assumimos como People pra nao perder a foto
            classification = 'PEOPLE';
        }
        
        if (classification === 'REJECT') {
            console.log(`❌ FOTO REJEITADA PELA IA (Olhos fechados/Careta/Borrão): ${file.name}`);
            continue; // ignora a foto (não entra no album!)
        }
        
        console.log(`✅ Aceita como: ${classification}`);
        const finalObj = { path: file.path, trail: file.trail, name: file.name, type: classification };
        
        gallery.allPhotos.push(finalObj);
        
        if (!gallery.trails[file.trail]) gallery.trails[file.trail] = [];
        gallery.trails[file.trail].push(finalObj);
        
        if (classification === 'LANDSCAPE') gallery.categories.landscape.push(finalObj);
        else gallery.categories.people.push(finalObj);
        
        await sleep(500); // Para evitar Rate Limit da Dashscope.
    }
    
    let jsData = `const galleryData = ${JSON.stringify(gallery, null, 2)};`;
    writeFileSync(OUTPUT_FILE, jsData);
    console.log("✅ Concluído com sucesso! Gravado em ai_gallery_data.js");
}

run();
