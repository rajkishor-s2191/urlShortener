import { readFile, writeFile } from 'fs/promises'
import { createServer } from 'http'
import path from 'path'
import crypto from 'crypto'

const PORT = 3002
const DATA_FILE = path.join("data", "links.json")

const serveFile = async (res, filtePath, contentType) => {
    try {
        const data = await readFile(filtePath)
        res.writeHead(200, { "Content-Type": contentType })
        res.end(data)
    }
    catch (err) {
        res.writeHead(404, { 'Content-Type': contentType })
        res.end("404 Page Not Found")
    }
}

const loadLinks = async () => {
    try {

        const data = await readFile(DATA_FILE, 'utf-8');
        if (data) {
            return JSON.parse(data)
        }
        else return {}
    }
    catch (err) {
        if (err.code === "ENOENT") {
            await writeFile(DATA_FILE, JSON.stringify({}))
            return {}
        }
        throw err;
    }
}

const saveLinks = async (links) => {
    try {
        await writeFile(DATA_FILE, JSON.stringify(links))
    } catch (err) {

    }
}

const server = createServer(async (req, res) => {
    if (req.method === "GET") {
        if (req.url === "/") {
            return serveFile(res, path.join("public", "index.html"), "text/html")
        }

        else if (req.url === "/links") {
            const links = await loadLinks()
            res.writeHead(200, {
                "Content-Type": "application/json"
            })
            return res.end(JSON.stringify(links))
        }
        else {
            const links = await loadLinks();
            const shortCode = req.url.slice(1)
            console.log("links redirect", req.url)

            if (links[shortCode]) {
                res.writeHead(302, { location: links[shortCode] })
                res.end()
            }

            res.writeHead(404, { "Content-Type": "text/plain" })
            return res.end("Shortened URL was not found")
        }
    }

    if (req.method === "POST" && req.url === "/shorten") {

        const links = await loadLinks()

        let body = ""
        req.on("data", (chunk) => body += chunk)
        req.on('end', async () => {
            console.log(body)
            const { url, shortCode } = JSON.parse(body)

            if (!url) {
                res.writeHead(400, { "Content-Type": "text/plain" })
                return res.end("URL is required")
            }

            const finalShortCode = shortCode || crypto.randomBytes(4).toString("hex")

            if (links[finalShortCode]) {
                res.writeHead(400, { "Content-Type": "text/plain" })
                return res.end("Short Code Already Exists")
            }

            links[finalShortCode] = url;
            await saveLinks(links)

            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: true, shortCode: finalShortCode }))
        })
    }
})

server.listen(PORT, () => {
    console.log("Server running at PORT 3002")
})
