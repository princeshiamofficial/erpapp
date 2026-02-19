
import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";
import { NextApiResponseServerIO } from "../../types/socket";
import { setIO } from "../../lib/socket-io";

export const config = {
    api: {
        bodyParser: false,
    },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
    if (!res.socket.server.io) {
        const path = "/api/socket";
        const httpServer: NetServer = res.socket.server as any;
        const io = new ServerIO(httpServer, {
            path: path,
            addTrailingSlash: false,
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ["polling", "websocket"],
            allowEIO3: true
        });

        io.on("connection", (socket) => {
            console.log("Client connected:", socket.id);

            socket.on("order-updated", (data) => {
                socket.broadcast.emit("order-updated", data);
            });

            socket.on("project-updated", (data) => {
                socket.broadcast.emit("project-updated", data);
            });

            socket.on("attendance-location-update", (data) => {
                // console.log("Location update received:", data);
                socket.broadcast.emit("attendance-location-update", data);
            });

            socket.on("disconnect", () => {
                console.log("Client disconnected:", socket.id);
            });
        });

        res.socket.server.io = io;
    }
    setIO(res.socket.server.io);

    res.end();
};

export default ioHandler;
