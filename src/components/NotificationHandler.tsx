import React, { useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function NotificationHandler() {
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (socket && user) {
      // Join user-specific room
      socket.emit("join", user.uid);

      // Listen for notifications
      socket.on("notification", (data: { title: string; message: string; type: string }) => {
        toast.info(data.message, {
          description: data.title,
          duration: 5000,
        });
      });

      return () => {
        socket.off("notification");
      };
    }
  }, [socket, user]);

  return null; // This component doesn't render anything
}
