import { useState } from "react";
import { MessageCircle } from "lucide-react";
import ContactModal from "./ContactModal";

export default function FloatingWhatsappCTA() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-label="Falar no WhatsApp"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-[#25D366] shadow-lg p-4 hover:scale-105 transition-transform"
      >
        <MessageCircle className="w-7 h-7 text-white" />
      </button>
      <ContactModal open={open} onOpenChange={setOpen} />
    </>
  );
}


