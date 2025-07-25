import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, Save, User, Briefcase, MapPin, Phone, Mail, DollarSign } from 'lucide-react';

interface StaffProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  photo_url?: string;
  can_bathe: boolean;
  can_groom: boolean;
  can_vet: boolean;
  hourly_rate?: number;
  location_id?: string;
  active: boolean;
}

const StaffProfile = () => {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    hourly_rate: '',
    can_bathe: false,
    can_groom: false,
    can_vet: false,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadStaffProfile();
    }
  }, [user]);

  const loadStaffProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const { data: staffData, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching staff profile:', error);
        toast.error('Erro ao carregar perfil');
        return;
      }

      if (staffData) {
        setProfile(staffData);
        setFormData({
          name: staffData.name || '',
          email: staffData.email || '',
          phone: staffData.phone || '',
          bio: staffData.bio || '',
          hourly_rate: staffData.hourly_rate?.toString() || '',
          can_bathe: staffData.can_bathe || false,
          can_groom: staffData.can_groom || false,
          can_vet: staffData.can_vet || false,
        });
        setPhotoPreview(staffData.photo_url);
      }
    } catch (error) {
      console.error('Error loading staff profile:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile || !profile) return null;

    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `staff-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vettale')
        .upload(filePath, photoFile);

      if (uploadError) {
        console.error('Error uploading photo:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('vettale')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao fazer upload da foto');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);

      let photoUrl = profile.photo_url;
      
      // Upload new photo if selected
      if (photoFile) {
        const uploadedUrl = await uploadPhoto();
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        }
      }

      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        bio: formData.bio || null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        can_bathe: formData.can_bathe,
        can_groom: formData.can_groom,
        can_vet: formData.can_vet,
        photo_url: photoUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('staff_profiles')
        .update(updateData)
        .eq('id', profile.id);

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      // Update local state
      setProfile({ ...profile, ...updateData });
      setPhotoFile(null);
      
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const getSpecialtyBadges = () => {
    const specialties = [];
    if (formData.can_bathe) specialties.push('Banho');
    if (formData.can_groom) specialties.push('Tosa');
    if (formData.can_vet) specialties.push('Veterinário');
    return specialties;
  };

  if (loading || isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-96 bg-gray-200 rounded"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-16 text-center">
          <p>Perfil de funcionário não encontrado.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Photo & Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações Básicas
                </CardTitle>
                <CardDescription>Seus dados de conta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Photo Upload */}
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={photoPreview || profile.photo_url || undefined} />
                    <AvatarFallback>
                      {profile.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'ST'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photo-upload"
                    />
                    <Label htmlFor="photo-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>
                          <Camera className="h-4 w-4 mr-2" />
                          Alterar Foto
                        </span>
                      </Button>
                    </Label>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                {/* Hourly Rate */}
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Valor por Hora (R$)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Specialties & Bio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Especialidades & Bio
                </CardTitle>
                <CardDescription>Defina suas habilidades e apresentação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Specialties */}
                <div className="space-y-4">
                  <Label>Especialidades</Label>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="can_bathe"
                          checked={formData.can_bathe}
                          onCheckedChange={(checked) => 
                            setFormData({ ...formData, can_bathe: checked })
                          }
                        />
                        <Label htmlFor="can_bathe">Banho</Label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="can_groom"
                          checked={formData.can_groom}
                          onCheckedChange={(checked) => 
                            setFormData({ ...formData, can_groom: checked })
                          }
                        />
                        <Label htmlFor="can_groom">Tosa</Label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="can_vet"
                          checked={formData.can_vet}
                          onCheckedChange={(checked) => 
                            setFormData({ ...formData, can_vet: checked })
                          }
                        />
                        <Label htmlFor="can_vet">Consulta Veterinária</Label>
                      </div>
                    </div>
                  </div>

                  {/* Show selected specialties */}
                  <div className="flex flex-wrap gap-2">
                    {getSpecialtyBadges().map((specialty) => (
                      <Badge key={specialty} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                    {getSpecialtyBadges().length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Selecione pelo menos uma especialidade
                      </p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Biografia</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Conte um pouco sobre você, sua experiência e especialidades..."
                    rows={6}
                  />
                  <p className="text-sm text-muted-foreground">
                    Esta informação será exibida para os clientes quando eles estiverem escolhendo um profissional.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar Perfil'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default StaffProfile;