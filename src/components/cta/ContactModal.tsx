import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { buildWhatsLink, maybeEmailIntake, formatBRPhoneInput } from "@/utils/whatsapp";

const schema = z.object({
  name: z.string().min(2, "Informe seu nome"),
  phone: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .refine((d) => d.length >= 10 && d.length <= 13, "Telefone inválido"),
  reason: z.enum(["marcar_banho"]),
  viaWhats: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export default function ContactModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "marcar_banho", viaWhats: true },
  });

  const phone = watch("phone") ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl shadow-xl" aria-label="Formulário de contato">
        <DialogHeader>
          <DialogTitle className="text-[#324B4B]">Iniciar conversa</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(async (data) => {
            const url = buildWhatsLink({ name: data.name, phone: data.phone, reason: data.reason });
            maybeEmailIntake({ name: data.name, phone: data.phone, reason: data.reason }).catch(() => {});
            window.open(url, "_blank", "noopener");
            onOpenChange(false);
          })}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="name">Nome*</Label>
            <Input id="name" aria-required {...register("name")} />
            {errors.name && <p className="text-red-600 text-sm">{String(errors.name.message)}</p>}
          </div>

          <div>
            <Label htmlFor="phone">Telefone*</Label>
            <Input
              id="phone"
              value={formatBRPhoneInput(phone)}
              onChange={(e) => setValue("phone", e.target.value)}
              inputMode="tel"
              aria-required
            />
            {errors.phone && <p className="text-red-600 text-sm">{String(errors.phone.message)}</p>}
          </div>

          <div>
            <Label htmlFor="reason">Motivo*</Label>
            <select id="reason" {...register("reason")} className="w-full border rounded-md p-2">
              <option value="marcar_banho">Marcar banho</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="viaWhats" {...register("viaWhats")} aria-checked={watch("viaWhats") ? "true" : "false"} />
            <Label htmlFor="viaWhats">Quero receber contato por WhatsApp</Label>
          </div>

          <Button className="w-full bg-[#324B4B] hover:bg-[#3B5858] rounded-2xl">Iniciar conversa</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}


