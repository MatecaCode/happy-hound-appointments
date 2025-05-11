
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, setYear, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Profile = () => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pets, setPets] = useState<any[]>([]);
  const [newPet, setNewPet] = useState({ 
    name: '', 
    breed: '', 
    age: '', 
    notes: '',
    birthday: null as Date | null
  });
  // Calendar year picker state
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  // Generate array of years from current year back to 25 years ago
  const yearsArray = Array.from(
    { length: 25 }, 
    (_, i) => new Date().getFullYear() - i
  );

  useEffect(() => {
    if (user) {
      setName(user.user_metadata.name || '');
      setPhone(user.user_metadata.phone || '');
      
      // Carregar pets do usuário
      const fetchPets = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('pets')
            .select('*')
            .eq('user_id', user.id);
          
          if (error) throw error;
          setPets(data || []);
        } catch (error: any) {
          toast.error(error.message || 'Erro ao carregar seus pets');
          console.error('Error fetching pets:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchPets();
    }
  }, [user]);

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name, phone }
      });
      
      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar perfil');
      console.error('Error updating profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPet(prev => ({ ...prev, [name]: value }));
  };

  const handleBirthdayChange = (date: Date | null) => {
    setNewPet(prev => ({ ...prev, birthday: date }));
  };

  const handleYearChange = (year: string) => {
    if (newPet.birthday) {
      const newDate = setYear(newPet.birthday, parseInt(year));
      setNewPet(prev => ({ ...prev, birthday: newDate }));
    } else {
      // If no date is selected yet, create one with the selected year
      const currentDate = new Date();
      const newDate = setYear(currentDate, parseInt(year));
      setNewPet(prev => ({ ...prev, birthday: newDate }));
    }
    setYearPickerOpen(false);
  };

  const addNewPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      if (!newPet.name.trim()) {
        toast.error('Por favor, informe o nome do pet');
        setIsSubmitting(false);
        return;
      }
      
      // Prepare pet data with birthday field
      const petData = {
        ...newPet,
        user_id: user.id,
        // Format birthday to YYYY-MM-DD if it exists
        birthday: newPet.birthday ? format(newPet.birthday, 'yyyy-MM-dd') : null
      };
      
      const { data, error } = await supabase
        .from('pets')
        .insert([petData])
        .select();
      
      if (error) {
        console.error('Error inserting pet:', error);
        throw error;
      }
      
      setPets([...pets, ...data]);
      setNewPet({ 
        name: '', 
        breed: '', 
        age: '', 
        notes: '',
        birthday: null
      });
      toast.success('Pet adicionado com sucesso!');
    } catch (error: any) {
      console.error('Error in addNewPet:', error);
      toast.error(error.message || 'Erro ao adicionar pet');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!user) {
    return (
      <Layout>
        <div className="py-16 px-6 text-center">
          <h1>Faça login para acessar seu perfil</h1>
          <Button asChild className="mt-4">
            <a href="/login">Entrar</a>
          </Button>
        </div>
      </Layout>
    );
  }
  
  const formatBirthday = (birthdayStr: string | null) => {
    if (!birthdayStr) return 'Não informado';
    
    try {
      return format(new Date(birthdayStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };
  
  return (
    <Layout>
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="mb-4">Meu <span className="text-primary">Perfil</span></h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Gerencie suas informações pessoais e seus pets
          </p>
        </div>
      </section>
      
      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="profile">
            <TabsList className="grid grid-cols-2 w-full mb-8">
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              <TabsTrigger value="pets">Meus Pets</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Informações de Perfil</CardTitle>
                  <CardDescription>
                    Atualize suas informações pessoais aqui
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <form onSubmit={updateProfile}>
                    <div className="grid gap-6">
                      <div className="grid gap-3">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={user.email || ''}
                          disabled
                        />
                        <p className="text-sm text-muted-foreground">
                          O email não pode ser alterado
                        </p>
                      </div>
                      
                      <div className="grid gap-3">
                        <Label htmlFor="name">Nome</Label>
                        <Input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      
                      <div className="grid gap-3">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="pets">
              <Card>
                <CardHeader>
                  <CardTitle>Meus Pets</CardTitle>
                  <CardDescription>
                    Gerencie os pets registrados para tosa
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-6">
                    {isLoading ? (
                      <p className="text-center py-4">Carregando seus pets...</p>
                    ) : pets.length > 0 ? (
                      <div className="grid gap-4">
                        {pets.map((pet) => (
                          <Card key={pet.id}>
                            <CardContent className="pt-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h3 className="text-lg font-medium">{pet.name}</h3>
                                  <p className="text-sm text-muted-foreground">Raça: {pet.breed || 'Não informada'}</p>
                                </div>
                                <div>
                                  <p className="text-sm">Idade: {pet.age || 'Não informada'}</p>
                                  <p className="text-sm">Aniversário: {formatBirthday(pet.birthday)}</p>
                                  {pet.notes && (
                                    <p className="text-sm text-muted-foreground mt-2">Notas: {pet.notes}</p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-4">Você ainda não tem pets registrados.</p>
                    )}
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Adicionar Novo Pet</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={addNewPet} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="pet-name">Nome do Pet *</Label>
                              <Input
                                id="pet-name"
                                name="name"
                                value={newPet.name}
                                onChange={handlePetInputChange}
                                required
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="pet-breed">Raça</Label>
                              <Input
                                id="pet-breed"
                                name="breed"
                                value={newPet.breed}
                                onChange={handlePetInputChange}
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="pet-age">Idade</Label>
                              <Input
                                id="pet-age"
                                name="age"
                                value={newPet.age}
                                onChange={handlePetInputChange}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="pet-birthday">Aniversário</Label>
                              <div className="flex items-center gap-2">
                                <Popover open={yearPickerOpen} onOpenChange={setYearPickerOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="w-[100px]"
                                    >
                                      {newPet.birthday ? getYear(newPet.birthday) : "Ano"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-52 p-0 h-[300px] overflow-y-auto" align="start">
                                    <div className="grid grid-cols-1">
                                      {yearsArray.map((year) => (
                                        <Button
                                          key={year}
                                          variant="ghost"
                                          className="justify-start font-normal"
                                          onClick={() => handleYearChange(year.toString())}
                                        >
                                          {year}
                                        </Button>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !newPet.birthday && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {newPet.birthday ? (
                                        format(newPet.birthday, "dd/MM/yyyy", { locale: ptBR })
                                      ) : (
                                        <span>Selecione uma data</span>
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={newPet.birthday || undefined}
                                      onSelect={handleBirthdayChange}
                                      initialFocus
                                      className={cn("p-3 pointer-events-auto")}
                                      captionLayout="dropdown-buttons"
                                      fromYear={1990}
                                      toYear={new Date().getFullYear()}
                                      classNames={{
                                        caption_dropdowns: "flex flex-col space-y-1",
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="pet-notes">Notas/Observações</Label>
                            <Input
                              id="pet-notes"
                              name="notes"
                              value={newPet.notes}
                              onChange={handlePetInputChange}
                            />
                          </div>
                          
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Adicionando...' : 'Adicionar Pet'}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
