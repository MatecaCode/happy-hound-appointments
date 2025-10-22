import React, { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PhoneInputBR from '@/components/inputs/PhoneInputBR';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, Save, User, Briefcase, Crop } from 'lucide-react';
import Cropper from 'react-easy-crop';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
    specialties: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);

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
        .maybeSingle();

      if (error && (error as any).code !== 'PGRST116') {
        console.error('Error fetching staff profile:', error);
        toast.error('Erro ao carregar perfil');
        return;
      }

      if (staffData) {
        setProfile(staffData);
        
        // Parse specialties from bio if they exist
        const bio = staffData.bio || '';
        let specialties = '';
        let cleanBio = bio;
        
        if (bio.startsWith('Especialidades: ')) {
          const lines = bio.split('\n');
          const specialtiesLine = lines[0];
          specialties = specialtiesLine.replace('Especialidades: ', '');
          cleanBio = lines.slice(2).join('\n'); // Skip the empty line too
        }
        
        setFormData({
          name: staffData.name || '',
          email: staffData.email || '',
          phone: staffData.phone || '',
          bio: cleanBio,
          specialties: specialties,
        });
        setPhotoPreview(staffData.photo_url);
        console.log('📋 Loaded staff profile photo_url:', staffData.photo_url);
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
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  }
};
  const onCropComplete = useCallback((croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', error => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: CropArea): Promise<File> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Set canvas size to cropped area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw the cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (file) => {
          if (file) {
            resolve(new File([file], 'cropped-image.jpg', { type: 'image/jpeg' }));
          }
        },
        'image/jpeg',
        0.9
      );
    });
  };

 // 🔧 Crop and preview
const handleCropSave = async () => {
  if (!photoPreview || !croppedAreaPixels) return;

  try {
    const croppedImage = await getCroppedImg(photoPreview, croppedAreaPixels);
    setPhotoFile(croppedImage);
    console.log('✅ Cropped file saved:', croppedImage);

    // Create preview URL for cropped image
    const reader = new FileReader();
    reader.onload = (event) => {
  console.log('📸 Preview URL set to:', event.target?.result);
  setPhotoPreview(event.target?.result as string);
};
    reader.readAsDataURL(croppedImage);

    setShowCropper(false);
    toast.success('Imagem ajustada com sucesso!');
  } catch (error) {
    console.error('Error cropping image:', error);
    toast.error('Erro ao ajustar imagem');
  }
};

// 📤 Upload photo to Supabase
const uploadPhoto = async (): Promise<string | null> => {
  if (!photoFile || !profile || !user) return null;

  try {
    console.log('📸 Starting photo upload for user:', user.id, 'profile:', profile.id);

    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/staff-photos/${fileName}`;

    console.log('📁 Upload path:', filePath);

    const { error: uploadError } = await supabase.storage
      .from('vettale')
      .upload(filePath, photoFile);

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('vettale')
      .getPublicUrl(filePath);

    console.log('✅ Generated public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('❌ Error uploading photo:', error);
    toast.error('Erro ao fazer upload da foto');
    return null;
  }
};

// 📝 Submit form handler
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

    // Combine bio and specialties into a single bio field
    const combinedBio = formData.specialties 
      ? `Especialidades: ${formData.specialties}\n\n${formData.bio}`
      : formData.bio;

    const updateData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      bio: combinedBio || null,
      photo_url: photoUrl,
      updated_at: new Date().toISOString(),
    };

    console.log('🔄 Updating staff profile with data:', updateData);

    const { error } = await supabase
      .from('staff_profiles')
      .update(updateData)
      .eq('id', profile.id);

    console.log('📊 Database update result:', { error, profileId: profile.id });

    if (error) {
      console.error('❌ Error updating profile:', error);
      throw error;
    }

    // Update local state
    const updatedProfile = { ...profile, ...updateData };
    setProfile(updatedProfile);
    setPhotoFile(null);
    setPhotoPreview(null);

    console.log('✅ Profile updated successfully, new photo_url:', photoUrl);

    // Force reload of staff profile to refresh Navigation component
    await loadStaffProfile();

    toast.success('Perfil atualizado com sucesso!');
  } catch (error) {
    console.error('❌ Error submitting form:', error);
    toast.error('Erro ao salvar perfil');
  } finally {
    setSaving(false);
  }
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
          <div className="w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-full overflow-hidden bg-muted/20 flex items-center justify-center">
            {(photoPreview || profile.photo_url) ? (
              <img 
                src={photoPreview || `${profile.photo_url}?t=${Date.now()}`} 
                alt="Profile"
                className="w-full h-full object-cover"
                onLoad={() => console.log('✅ Profile image loaded successfully:', photoPreview || profile.photo_url)}
                onError={(e) => {
                  console.error('❌ Profile image failed to load:', e.currentTarget.src);
                  // Try to load the image without cache buster as fallback
                  if (e.currentTarget.src.includes('?t=')) {
                    e.currentTarget.src = profile.photo_url || '';
                  }
                }}
                crossOrigin="anonymous"
              />
            ) : (
              <div className="text-center">
                <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Sem foto</p>
              </div>
            )}
          </div>

                  
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
                    {photoFile && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowCropper(true)}
                      >
                        <Crop className="h-4 w-4 mr-2" />
                        Ajustar
                      </Button>
                    )}
                  </div>
                  {(photoPreview || profile.photo_url) && (
                    <p className="text-xs text-muted-foreground text-center">
                      Use o botão "Ajustar" para recortar a imagem antes de salvar
                    </p>
                  )}
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
                  <PhoneInputBR
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    placeholder="(11) 99999-9999"
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
                <div className="space-y-2">
                  <Label htmlFor="specialties">Especialidades</Label>
                  <Input
                    id="specialties"
                    value={formData.specialties}
                    onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                    placeholder="Ex: Tosa, Banho, Consulta Veterinária, Cirurgia..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Liste suas especialidades separadas por vírgula
                  </p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Biografia</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Conte um pouco sobre você, sua experiência e formação..."
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

        {/* Image Cropper Dialog */}
        <Dialog open={showCropper} onOpenChange={setShowCropper}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ajustar Foto de Perfil</DialogTitle>
              <DialogDescription>
                Use os controles abaixo para ajustar e recortar sua foto de perfil.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {photoPreview && (
                <div className="relative h-64 w-full">
                  <Cropper
                    image={photoPreview}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    cropShape="round"
                    showGrid={false}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Zoom</Label>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCropper(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCropSave}>
                  Aplicar Ajuste
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
     </Layout>
  );
};

export default StaffProfile;