import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button.js";
import { Card, CardContent } from "../components/ui/card.js";
import {
    Loader2,
    Laptop,
    Smartphone,
    MonitorSmartphone,
    XCircle,
    CheckCircle2,
} from "lucide-react";

interface Session {
    _id: string;
    userAgent: string;
    ipAddress: string;
    createdAt: string;
}

const dummySessions: Session[] = [
    {
        _id: "1",
        userAgent: "Chrome on Windows 11",
        ipAddress: "192.168.1.24",
        createdAt: "2025-11-08T12:15:00Z",
    },
    {
        _id: "2",
        userAgent: "Safari on iPhone 15",
        ipAddress: "10.0.0.45",
        createdAt: "2025-11-07T20:30:00Z",
    },
    {
        _id: "3",
        userAgent: "Edge on MacBook Air",
        ipAddress: "172.16.0.88",
        createdAt: "2025-11-06T09:00:00Z",
    },
];

const ActiveSessions: React.FC = () => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const currentDevice = "Chrome on Windows 11"; // simulate current device

    useEffect(() => {
        const timer = setTimeout(() => {
            setSessions(dummySessions);
            setLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    const revokeSession = (id: string) => {
        setRevokingId(id);
        setTimeout(() => {
            setSessions((prev) => prev.filter((s) => s._id !== id));
            setRevokingId(null);
        }, 800);
    };

    const getIcon = (ua: string) => {
        if (/iPhone|Android/i.test(ua)) return <Smartphone className="w-6 h-6" />;
        if (/Mac|Windows/i.test(ua))
            return <Laptop className="w-6 h-6" />;
        return <MonitorSmartphone className="w-6 h-6" />;
    };

    if (loading)
        return (
            <div className="flex justify-center items-center h-[70vh] text-gray-500">
                <Loader2 className="animate-spin w-6 h-6 mr-2" />
                Loading sessions...
            </div>
        );

    return (
        <motion.div
            className="max-w-3xl mx-auto p-6 space-y-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="text-center">
                <h1 className="text-3xl font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                    Active Sessions
                </h1>
                <p className="text-gray-500 mt-2">
                    Manage your logged-in devices securely.
                </p>
            </div>

            {sessions.length === 0 ? (
                <motion.p
                    className="text-gray-500 text-center mt-20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    No active sessions found.
                </motion.p>
            ) : (
                <div className="grid gap-4">
                    {sessions.map((session, i) => {
                        const isCurrent = session.userAgent === currentDevice;
                        return (
                            <motion.div
                                key={session._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <Card
                                    className={`rounded-2xl backdrop-blur-md border ${isCurrent
                                        ? "border-blue-400 bg-blue-50/40"
                                        : "border-gray-200 bg-white/60"
                                        } shadow-sm hover:shadow-lg transition-all duration-200`}
                                >
                                    <CardContent className="flex justify-between items-center p-5">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`p-3 rounded-full ${isCurrent
                                                    ? "bg-blue-500/20 text-blue-600"
                                                    : "bg-gray-200/60 text-gray-700"
                                                    }`}
                                            >
                                                {getIcon(session.userAgent)}
                                            </div>

                                            <div>
                                                <p className="font-medium text-gray-800 flex items-center gap-2">
                                                    {session.userAgent}
                                                    {isCurrent && (
                                                        <span className="flex items-center gap-1 text-blue-600 text-xs font-semibold">
                                                            <CheckCircle2 className="w-3 h-3" /> This Device
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    IP: {session.ipAddress}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Logged in:{" "}
                                                    {new Date(session.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            variant="destructive"
                                            disabled={revokingId === session._id}
                                            onClick={() => revokeSession(session._id)}
                                            className="flex items-center gap-1"
                                        >
                                            {revokingId === session._id ? (
                                                <>
                                                    <Loader2 className="animate-spin w-4 h-4" /> Revoking...
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-4 h-4" /> Revoke
                                                </>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
};

export default ActiveSessions;
