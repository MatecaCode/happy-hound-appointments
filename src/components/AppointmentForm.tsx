
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { ptBR } from 'date-fns/locale';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';

interface LocationState {
  service?: string;
}

// Serviços disponíveis e seus preços
const services = [
  { name: "Banho & Escovação Básica", price: "R$40" },
  { name: "Tosa Completa", price: "R$60" },
  { name: "Pacote Spa Luxo", price: "R$80" },
  { name: "Corte de Unhas", price: "R$15" },
  { name: "Limpeza de Dentes", price: "R$25" }
];

// Horários disponíveis
const timeSlots = [
  "9:00", "10:00", "11:00", 
  "13:00", "14:00", "15:00", "16:00"
];

// Esquema do formulário
const formSchema = z.object({
  ownerName: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("Endereço de e-mail inválido"),
  phone: z.string().min(10, "Número de telefone válido obrigatório"),
  petName: z.string().min(1, "Nome do pet é obrigatório"),
  breed: z.string().min(1, "Raça é obrigatória"),
  service: z.string().min(1, "Por favor selecione um serviço"),
  date: z.date({
    required_error: "Por favor selecione uma data",
  }),
  time: z.string().min(1, "Por favor selecione um horário"),
  specialRequests: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const AppointmentForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  // Padrão para o primeiro serviço ou o que foi passado no state
  const defaultService = state?.service || services[0].name;
  
  // Desabilitar datas passadas e domingos no seletor de data
  const disabledDays = (date: Date) => {
    const day = date.getDay();
    const isBeforeToday = date < new Date(new Date().setHours(0, 0, 0, 0));
    return day === 0 || isBeforeToday; // Domingo ou dias passados
  };
  
  // Configuração do formulário
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service: defaultService,
      specialRequests: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    // Para fins de demonstração, apenas mostrar toast e navegar
    console.log("Dados do agendamento:", data);
    
    // Mostrar mensagem de sucesso
    toast.success("Agendamento realizado com sucesso!", {
      description: `Seu agendamento para ${data.petName} está marcado para ${format(data.date, 'd \'de\' MMMM \'de\' yyyy', { locale: ptBR })} às ${data.time}.`,
    });
    
    // Navegar para a página de confirmação
    navigate("/confirmation", { state: { appointment: data } });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Agendar uma Tosa</CardTitle>
        <CardDescription>
          Preencha o formulário abaixo para agendar uma sessão de tosa para seu cachorro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações do Dono */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informações do Dono</h3>
              
              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seu Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="voce@exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 98765-4321" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Informações do Pet */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informações do Pet</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="petName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Pet</FormLabel>
                      <FormControl>
                        <Input placeholder="Max" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="breed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raça</FormLabel>
                      <FormControl>
                        <Input placeholder="Golden Retriever" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Detalhes do Agendamento */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Detalhes do Agendamento</h3>
              
              <FormField
                control={form.control}
                name="service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviço</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.name} value={service.name}>
                            {service.name} - {service.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                              ) : (
                                <span>Escolha uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={disabledDays}
                            initialFocus
                            className="p-3 pointer-events-auto"
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um horário">
                              <div className="flex items-center">
                                <Clock className="mr-2 h-4 w-4" />
                                {field.value || "Selecione um horário"}
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="specialRequests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solicitações Especiais</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Quaisquer instruções ou solicitações especiais para a tosa do seu pet..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit" className="w-full">
              Agendar Tosa
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default AppointmentForm;
