import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import ProjectCard from "@/components/project-card";
import OdsIcon from "@/components/ui/ods-icon";
import { Button } from "@/components/ui/button";
import { 
  Calculator, 
  ArrowRight, 
  TrendingUp, 
  LineChart 
} from "lucide-react";

const HomePage = () => {
  // Fetch projects for the home page
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch SDGs for the home page
  const { data: sdgs } = useQuery({
    queryKey: ['/api/sdgs'],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary-50 to-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="w-full md:w-1/2 mb-10 md:mb-0">
              <h1 className="font-bold text-4xl md:text-5xl text-gray-800 leading-tight mb-6">
                <span className="text-primary">Fundo Verde:</span> Reduza sua pegada de carbono e invista em ODS
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Calcule suas emissões de CO₂, compense-as através de fundos verdes e acompanhe o impacto do seu investimento nos Objetivos de Desenvolvimento Sustentável.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Button asChild size="lg" className="px-6">
                  <Link href="/auth">
                    Registrar Empresa
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="px-6 border-primary text-primary hover:bg-primary/10">
                  <Link href="/projetos">
                    Ver Projetos
                  </Link>
                </Button>
              </div>
            </div>
            <div className="w-full md:w-1/2 mt-8 md:mt-0">
              <div className="rounded-lg shadow-xl w-full h-auto overflow-hidden bg-white">
                {/* Hero illustration */}
                <div className="w-full h-80 rounded-lg overflow-hidden">
                  <img 
                    src="https://cdn.xl.pt/bs/uploads/sites/37/2022/10/investidores-2048x1024.jpg" 
                    alt="ESG Investment"
                    className="w-full h-full object-cover object-center"
                    loading="eager"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.src = "/assets/sustainability-forest.svg";
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-bold text-3xl text-gray-800 mb-4">Conheça o Fundo Verde</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Assista ao vídeo e descubra como nossa plataforma está transformando o investimento sustentável em Angola.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg shadow-xl"
                src="https://www.youtube.com/embed/VU7OZApVkDY"
                title="Fundo Verde - Investimento Sustentável"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="font-bold text-3xl text-center text-gray-800 mb-12">Como Funciona</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-lg p-6 shadow-md border-t-4 border-primary hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Calculator className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-xl text-center mb-3">1. Calcule suas Emissões</h3>
              <p className="text-gray-600 text-center">
                Insira dados sobre o consumo de energia, combustíveis e transporte da sua empresa para calcular sua pegada de carbono.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="bg-white rounded-lg p-6 shadow-md border-t-4 border-secondary hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-secondary-50 rounded-full flex items-center justify-center mb-4 mx-auto">
                <TrendingUp className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="font-semibold text-xl text-center mb-3">2. Invista em ODS</h3>
              <p className="text-gray-600 text-center">
                Compense suas emissões investindo em projetos alinhados aos Objetivos de Desenvolvimento Sustentável da ONU.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="bg-white rounded-lg p-6 shadow-md border-t-4 border-accent hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 mx-auto">
                <LineChart className="h-8 w-8 text-accent" />
              </div>
              <h3 className="font-semibold text-xl text-center mb-3">3. Acompanhe o Impacto</h3>
              <p className="text-gray-600 text-center">
                Visualize o progresso dos projetos apoiados e o impacto positivo gerado pelo seu investimento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="font-bold text-3xl text-center text-gray-800 mb-4">Projetos Ativos</h2>
          <p className="text-gray-600 text-center max-w-3xl mx-auto mb-12">
            Conheça os projetos sustentáveis que estão recebendo investimentos através da nossa plataforma.
          </p>
          
          {/* Project Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects && projects.length > 0 ? (
              projects.slice(0, 3).map((project: any) => (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  description={project.description}
                  imageUrl={project.imageUrl}
                  totalInvested={project.totalInvested}
                  displayInvestment={project.displayInvestment}
                  sdg={project.sdg}
                />
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-gray-500">Carregando projetos...</p>
              </div>
            )}
          </div>
          
          <div className="text-center mt-10">
            <Button asChild className="px-6 py-3 bg-secondary hover:bg-secondary/90">
              <Link href="/projetos" className="inline-flex items-center">
                Ver Todos os Projetos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* SDGs Overview Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="font-bold text-3xl text-center text-gray-800 mb-4">Objetivos de Desenvolvimento Sustentável</h2>
          <p className="text-gray-600 text-center max-w-3xl mx-auto mb-12">
            Escolha entre os 17 ODS da ONU para direcionar seu investimento e impacto positivo.
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-6xl mx-auto">
            {sdgs && sdgs.length > 0 ? (
              sdgs
                .filter((sdg: any) => sdg.number >= 1 && sdg.number <= 10)
                .map((sdg: any) => (
                  <Link key={sdg.id} href={`/ods/${sdg.id}`}>
                    <OdsIcon 
                      number={sdg.number} 
                      name={sdg.name} 
                      color={sdg.color}
                    />
                  </Link>
                ))
            ) : (
              <div className="col-span-5 text-center py-12">
                <p className="text-gray-500">Carregando ODS...</p>
              </div>
            )}
          </div>
          
          <div className="text-center mt-10">
            <Button asChild variant="outline" className="px-6 py-3 border-secondary text-secondary hover:bg-secondary/10">
              <Link href="/ods" className="inline-flex items-center">
                Ver Todos os ODS
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default HomePage;
