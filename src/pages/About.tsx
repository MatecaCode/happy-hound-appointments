import React from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Heart, Calendar, Dog, Syringe, Cat } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';


const inaugurationUrl = supabase
  .storage
  .from('websitecontent')
  .getPublicUrl('Inauguration Clinic.jpg').data.publicUrl;

const caminhadaUrl = supabase
  .storage
  .from('websitecontent')
  .getPublicUrl('Dog Minhada com pessoas.jpg').data.publicUrl;

const journalUrl = supabase
  .storage
  .from('websitecontent')
  .getPublicUrl('PinkClinic.jpg').data.publicUrl;



const About = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="mb-4">Sobre <span className="text-primary">Nós</span></h1>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Uma Jornada de Amor e Inovação pelos Pets
            </p>
          </div>
        </div>
      </section>
      
      {/* Nossa História */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="mb-6">Nossa <span className="text-primary">História</span></h2>
              <p className="text-muted-foreground mb-6">
                Há mais de 40 anos, trocamos a agitação da capital paulista pela tranquilidade de Atibaia para realizar um sonho: 
                construir a primeira clínica veterinária da cidade totalmente dedicada ao bem‑estar dos animais. Em 1988 compramos 
                o terreno da Rua Lucas, onde inauguramos nossa sede em 1990.
              </p>
              <p className="text-muted-foreground">
                A paixão cresceu, a família também, e em dezembro de 2011 mudamos para nosso endereço atual — a terceira clínica 
                veterinária de Atibaia, projetada do zero para oferecer um centro completo de saúde, estética e comportamento pet.
              </p>
            </div>
            <div>
              <img 
                src="https://ieotixprkfglummoobkb.supabase.co/storage/v1/object/public/websitecontent//Inauguration%20Clinic.jpg"
                alt="Nossa primeira clínica em 1990" 
                className="rounded-lg shadow-lg h-96 w-full object-cover"
              />
              <p className="text-sm text-center mt-2 text-muted-foreground">Nossa primeira clínica inaugurada em 1990</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Pioneiros que Fazem História */}
      <section className="py-16 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-center mb-12">Pioneiros que <span className="text-primary">Fazem História</span></h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="flex gap-6">
              <div className="flex-shrink-0 mt-1">
                <Dog className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Primeiro TaxiDog da cidade</h3>
                <p className="text-muted-foreground">
                  Quando ninguém falava em transporte pet, já levávamos cães e gatos com segurança — de Fusca, 
                  depois de Fiorino.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6">
              <div className="flex-shrink-0 mt-1">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Cãominhada e eventos caninos</h3>
                <p className="text-muted-foreground">
                  Trouxemos grandes patrocinadores, parceria com Purina Agility e transformamos finais de semana 
                  em programas para toda a família.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6">
              <div className="flex-shrink-0 mt-1">
                <Cat className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Educação e comunidade</h3>
                <p className="text-muted-foreground">
                  Feiras de adoção, ações em escolas e eventos temáticos aproximaram milhares de crianças do 
                  universo pet.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6">
              <div className="flex-shrink-0 mt-1">
                <Syringe className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Serviços premium e medicina integrativa</h3>
                <p className="text-muted-foreground">
                  De check‑ups preventivos a acupuntura, oferecemos especialidades cuidadosamente selecionadas.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-12">
            <img 
              src="https://ieotixprkfglummoobkb.supabase.co/storage/v1/object/public/websitecontent//Dog%20Minhada%20com%20pessoas.jpg"
              alt="Eventos da Cãominhada" 
              className="rounded-lg shadow-lg h-96 w-full object-cover"
            />
            <p className="text-sm text-center mt-2 text-muted-foreground">Nossa 2ª Cãominhada (1995): um encontro inesquecível que uniu famílias, espalhou sorrisos e arrecadou fundos para cães em situação de risco 🐶</p>
          </div>
        </div>
      </section>
      
      {/* O Que Nos Move */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-center mb-12">O Que Nos <span className="text-primary">Move</span></h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-4">Cuidado nos detalhes</h3>
              <p className="text-muted-foreground">
                Do primeiro atendimento ao banho & tosa com penteados elaborados, sua tranquilidade é a nossa prioridade.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-4">Customer Success animal</h3>
              <p className="text-muted-foreground">
                Acompanhamos cada etapa da jornada de saúde do pet para garantir resultados duradouros.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-4">Segurança em primeiro lugar</h3>
              <p className="text-muted-foreground">
                Infraestrutura, protocolos rigorosos e profissionais experientes asseguram tratamentos de ponta com total confiança.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-4">Formamos profissionais</h3>
              <p className="text-muted-foreground">
                Muitos talentos que começaram conosco abriram seus próprios negócios, impulsionando o mercado pet local.
              </p>
            </div>
          </div>
          
          <div className="mt-12">
            <img 
               src="https://ieotixprkfglummoobkb.supabase.co/storage/v1/object/public/websitecontent//Team.png" 
              alt="Nossa equipe atual" 
              className="rounded-lg shadow-lg h-96 w-full object-cover object-top"
            />
            <p className="text-sm text-center mt-2 text-muted-foreground">Nossa equipe de profissionais dedicados</p>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="mb-6">Agende a sua visita</h2>
          <p className="text-primary-foreground/90 max-w-2xl mx-auto mb-8">
            Venha conhecer o Centro Veterinário Completo mais tradicional de Atibaia. Estamos prontos para cuidar do seu pet — 
            com a experiência de quem entende e o carinho de quem ama.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/book">
              <Button size="lg" variant="secondary">Agendar Consulta</Button>
            </Link>
            <Link to="/services">
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/20">
                Conhecer Serviços
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
