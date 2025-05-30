import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Importar setupAuth do arquivo auth
import { setupAuth } from "./auth";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import { mkdir } from "fs/promises";
import { 
  consumptionRecordInsertSchema, 
  paymentProofInsertSchema, 
  projectInsertSchema, 
  projectUpdateInsertSchema, 
  projectUpdateSchema, 
  carbonLeaderboardInsertSchema,
  investments 
} from "@shared/schema";
import { z } from "zod";
import { db } from "@db";

// Configure multer for file uploads
const uploadsDir = path.resolve(process.cwd(), "uploads");

// Create uploads directory if it doesn't exist
(async () => {
  try {
    await mkdir(uploadsDir, { recursive: true });
    await mkdir(path.join(uploadsDir, "logos"), { recursive: true });
    await mkdir(path.join(uploadsDir, "proofs"), { recursive: true });
    await mkdir(path.join(uploadsDir, "projects"), { recursive: true });
  } catch (error) {
    console.error("Error creating upload directories:", error);
  }
})();

const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "uploads";
    
    if (req.path.includes("/company/logo")) {
      folder = path.join(uploadsDir, "logos");
    } else if (req.path.includes("/payment-proof")) {
      folder = path.join(uploadsDir, "proofs");
    } else if (req.path.includes("/project")) {
      folder = path.join(uploadsDir, "projects");
    }
    
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage_config });

// Usando o isAuthenticated exportado de replitAuth.ts

// Middleware to check if user is admin
function isAdmin(req: Request, res: Response, next: any) {
  if (req.isAuthenticated() && req.user?.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: "Acesso negado" });
}

// Middleware to check if user is company
function isCompany(req: Request, res: Response, next: any) {
  if (req.isAuthenticated() && req.user?.role === 'company') {
    return next();
  }
  res.status(403).json({ message: "Acesso negado" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    // Only serve files to authenticated users
    if (req.isAuthenticated()) {
      return next();
    }
    // Allow public access to project images and company logos
    // Adicionado logs para depuração
    console.log(`Requisição de arquivo: ${req.path}`);
    if (req.path.startsWith("/projects/") || req.path.startsWith("/logos/")) {
      console.log(`Permitindo acesso público ao arquivo: ${req.path}`);
      return next();
    }
    res.status(401).json({ message: "Não autorizado" });
  }, express.static(uploadsDir));
  
  // Adicionar rota especial para logos sem exigir autenticação
  app.use("/company-logos", express.static(path.join(uploadsDir, "logos")));

  // Public routes

  // Get all SDGs
  app.get("/api/sdgs", async (req, res) => {
    try {
      console.log("Buscando todos os SDGs");
      const sdgs = await storage.getAllSdgs();
      console.log("SDGs encontrados:", sdgs ? sdgs.length : 0);
      res.json(sdgs);
    } catch (error) {
      console.error("Erro detalhado ao buscar SDGs:", error);
      res.status(500).json({ message: "Erro ao buscar ODSs" });
    }
  });

  // Get SDG by ID
  app.get("/api/sdgs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const sdg = await storage.getSdgById(id);
      if (!sdg) {
        return res.status(404).json({ message: "ODS não encontrado" });
      }
      
      // Get companies investing in this SDG
      const investingCompanies = await storage.getInvestingCompaniesForSdg(id);
      
      // Return combined data
      res.json({
        ...sdg,
        investingCompanies
      });
    } catch (error) {
      console.error('Error in /api/sdgs/:id route:', error);
      res.status(500).json({ message: "Erro ao buscar ODS" });
    }
  });

  // Get SDG by number
  app.get("/api/sdgs/number/:number", async (req, res) => {
    try {
      const number = parseInt(req.params.number);
      if (isNaN(number)) {
        return res.status(400).json({ message: "Número inválido" });
      }
      
      const sdg = await storage.getSdgByNumber(number);
      if (!sdg) {
        return res.status(404).json({ message: "ODS não encontrado" });
      }
      
      res.json(sdg);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar ODS" });
    }
  });

  // Get all projects
  app.get("/api/projects", async (req, res) => {
    try {
      console.log("Buscando todos os projetos");
      const projects = await storage.getAllProjects();
      console.log("Projetos encontrados:", projects ? projects.length : 0);
      res.json(projects);
    } catch (error) {
      console.error("Erro detalhado ao buscar projetos:", error);
      res.status(500).json({ message: "Erro ao buscar projetos" });
    }
  });

  // Get project by ID
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const project = await storage.getProjectById(id);
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar projeto" });
    }
  });

  // Get projects by SDG ID
  app.get("/api/projects/sdg/:sdgId", async (req, res) => {
    try {
      const sdgId = parseInt(req.params.sdgId);
      if (isNaN(sdgId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const projects = await storage.getProjectsBySDG(sdgId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar projetos" });
    }
  });

  // Company routes

  // Update company profile
  app.put("/api/company/profile", isCompany, async (req, res) => {
    try {
      const { name, sector, phone, location, employeeCount } = req.body;
      
      if (!name || !sector) {
        return res.status(400).json({ message: "Nome e setor são obrigatórios" });
      }
      
      const updated = await storage.updateCompany(req.user.company.id, {
        name,
        sector,
        phone: phone || null,
        location: location || null,
        employeeCount: employeeCount || null
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar perfil" });
    }
  });

  // Upload company logo
  app.post("/api/company/logo", isCompany, upload.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }
      
      // Ensure the logo directory exists
      try {
        await mkdir(path.join(uploadsDir, "logos"), { recursive: true });
      } catch (err) {
        console.error("Error ensuring logo directory exists:", err);
      }
      
      const logoUrl = `/uploads/logos/${req.file.filename}`;
      console.log("Logo file saved at:", logoUrl);
      
      const updated = await storage.updateCompany(req.user.company.id, {
        logoUrl
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }
      
      // Include user data with updated logo in response
      const updatedUser = await storage.getUserWithCompany(req.user.id);
      
      res.json({ 
        logoUrl,
        user: updatedUser
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: "Erro ao fazer upload do logo" });
    }
  });

  // Create consumption record
  app.post("/api/company/consumption", isCompany, async (req, res) => {
    try {
      // Log the request data for debugging
      console.log('Consumo recebido:', req.body);
      
      // Primeiro, adicione o companyId aos dados recebidos
      const dataWithCompanyId = {
        ...req.body,
        companyId: req.user!.company.id,
        month: req.body.month || "",
        day: req.body.day || null,
        year: req.body.year || new Date().getFullYear(),
      };
      
      console.log('Dados com companyId:', dataWithCompanyId);
      
      // Agora valide os dados
      const validationResult = consumptionRecordInsertSchema.safeParse(dataWithCompanyId);
      
      if (!validationResult.success) {
        console.log('Erro de validação:', validationResult.error.format());
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: validationResult.error.format() 
        });
      }
      
      // Use os dados validados diretamente
      const record = await storage.createConsumptionRecord(validationResult.data);
      res.status(201).json(record);
    } catch (error) {
      console.error('Erro ao criar registro de consumo:', error);
      res.status(500).json({ message: "Erro ao criar registro de consumo" });
    }
  });

  // Get consumption records for company
  app.get("/api/company/consumption", isCompany, async (req, res) => {
    try {
      const records = await storage.getConsumptionRecordsForCompany(req.user!.company.id);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar registros de consumo" });
    }
  });

  // Upload payment proof
  app.post("/api/company/payment-proof", isCompany, upload.single("proof"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }
      
      const fileUrl = `/uploads/proofs/${req.file.filename}`;
      const { amount, consumptionRecordId, sdgId } = req.body;
      
      // Validate amount
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Valor inválido" });
      }
      
      // Create payment proof data object
      const paymentProofData: any = {
        companyId: req.user!.company.id,
        fileUrl,
        amount: amount.toString(), // Convert to string as required by schema
        status: 'pending' as const
      };
      
      // Only add consumptionRecordId if it's a valid number
      if (consumptionRecordId && !isNaN(parseInt(consumptionRecordId))) {
        Object.assign(paymentProofData, { consumptionRecordId: parseInt(consumptionRecordId) });
      }
      
      // Only add sdgId if it's a valid number
      if (sdgId && !isNaN(parseInt(sdgId))) {
        Object.assign(paymentProofData, { sdgId: parseInt(sdgId) });
      }
      
      console.log("Enviando dados para criação do comprovativo:", paymentProofData);
      
      // Create payment proof
      const proof = await storage.createPaymentProof(paymentProofData);
      
      res.status(201).json(proof);
    } catch (error) {
      console.error("Erro ao processar upload do comprovativo:", error);
      if (error instanceof Error) {
        console.error("Mensagem do erro:", error.message);
        console.error("Stack trace:", error.stack);
      }
      res.status(500).json({ message: "Erro ao fazer upload do comprovativo" });
    }
  });

  // Get payment proofs for company
  app.get("/api/company/payment-proofs", isCompany, async (req, res) => {
    try {
      const proofs = await storage.getPaymentProofsForCompany(req.user.company.id);
      res.json(proofs);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar comprovativos" });
    }
  });

  // Get company statistics
  app.get("/api/company/stats", isCompany, async (req, res) => {
    try {
      const stats = await storage.getCompanyStats(req.user.company.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  // Get investments for company
  app.get("/api/company/investments", isCompany, async (req, res) => {
    try {
      if (!req.user || !req.user.company) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Buscar investimentos diretamente
      const projectInvestments = await storage.getInvestmentsForCompany(req.user.company.id);
      
      // Exibir os investimentos disponíveis no log
      console.log(`Retornando ${projectInvestments.length} investimentos para a empresa ${req.user.company.id}`);
      res.json(projectInvestments);
    } catch (error) {
      console.error("Erro ao buscar investimentos:", error);
      res.status(500).json({ message: "Erro ao buscar investimentos" });
    }
  });

  // Admin routes

  // Get all companies
  app.get("/api/admin/companies", isAdmin, async (req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar empresas" });
    }
  });
  
  // Get company by ID with detailed stats
  app.get("/api/admin/companies/:id", isAdmin, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      if (isNaN(companyId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const company = await storage.getCompanyById(companyId);
      if (!company) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }
      
      // Get additional data for this company
      const stats = await storage.getCompanyStats(companyId);
      const paymentProofs = await storage.getPaymentProofsForCompany(companyId);
      const investments = await storage.getInvestmentsForCompany(companyId);
      
      res.json({
        ...company,
        stats,
        paymentProofs,
        investments
      });
    } catch (error) {
      console.error("Error getting company details:", error);
      res.status(500).json({ message: "Erro ao buscar detalhes da empresa" });
    }
  });

  // Get admin dashboard statistics
  app.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });
  
  // Rota temporária para remover investimentos duplicados (apenas admin)
  app.get("/api/admin/fix-duplicate-investments", isAdmin, async (req, res) => {
    try {
      // Primeiro, vamos encontrar todos os investimentos
      const allInvestments = await db.select().from(investments);
      console.log(`Total de investimentos: ${allInvestments.length}`);
      
      // Mapa para rastrear investimentos por payment_proof_id
      const investmentsByPaymentProofId = new Map();
      const duplicates = [];
      
      // Identificar duplicações
      for (const inv of allInvestments) {
        if (!inv.paymentProofId) continue; // Pular se não tiver payment_proof_id
        
        if (investmentsByPaymentProofId.has(inv.paymentProofId)) {
          // É uma duplicação, adicionar à lista para remoção
          duplicates.push(inv);
        } else {
          // Primeiro investimento com este payment_proof_id
          investmentsByPaymentProofId.set(inv.paymentProofId, inv);
        }
      }
      
      console.log(`Encontradas ${duplicates.length} duplicações`);
      
      // Remover duplicações
      for (const duplicate of duplicates) {
        console.log(`Removendo investimento duplicado ID ${duplicate.id} (paymentProofId: ${duplicate.paymentProofId})`);
        await db.delete(investments).where(eq(investments.id, duplicate.id));
      }
      
      res.json({ 
        message: "Limpeza concluída", 
        totalInvestments: allInvestments.length, 
        duplicatesRemoved: duplicates.length,
        remainingInvestments: allInvestments.length - duplicates.length
      });
    } catch (error) {
      console.error("Erro ao limpar investimentos duplicados:", error);
      res.status(500).json({ message: "Erro ao limpar investimentos duplicados" });
    }
  });

  // Get pending payment proofs
  app.get("/api/admin/payment-proofs/pending", isAdmin, async (req, res) => {
    try {
      const proofs = await storage.getPendingPaymentProofs();
      res.json(proofs);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar comprovativos pendentes" });
    }
  });

  // Update payment proof status
  app.put("/api/admin/payment-proofs/:id/status", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const { status } = req.body;
      if (status !== 'approved' && status !== 'rejected') {
        return res.status(400).json({ message: "Status inválido" });
      }
      
      const updated = await storage.updatePaymentProofStatus(id, status);
      if (!updated) {
        return res.status(404).json({ message: "Comprovativo não encontrado" });
      }
      
      // If the payment was approved and has an SDG, create an investment automatically
      if (status === 'approved' && updated.sdgId) {
        console.log(`Comprovativo ${id} aprovado com ODS ${updated.sdgId}. Criando investimento...`);
        
        // Get projects for this SDG
        const projectsForSdg = await storage.getProjectsBySDG(updated.sdgId);
        
        if (projectsForSdg && projectsForSdg.length > 0) {
          // Use the first project for now
          const project = projectsForSdg[0];
          
          // Create investment
          await storage.createInvestment({
            companyId: updated.companyId,
            projectId: project.id,
            amount: updated.amount,
            paymentProofId: updated.id,
            createdAt: new Date()
          });
          
          console.log(`Investimento criado para o projeto ${project.name}`);
        } else {
          console.log(`Nenhum projeto encontrado para o ODS ${updated.sdgId}`);
        }
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      res.status(500).json({ message: "Erro ao atualizar status" });
    }
  });

  // Get payment proofs without SDG
  app.get("/api/admin/payment-proofs/without-sdg", isAdmin, async (req, res) => {
    try {
      const proofs = await storage.getPaymentProofsWithoutSdg();
      res.json(proofs);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar comprovativos sem ODS" });
    }
  });

  // Assign SDG to payment proof
  app.put("/api/admin/payment-proofs/:id/sdg", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const { sdgId } = req.body;
      if (!sdgId || isNaN(parseInt(sdgId))) {
        return res.status(400).json({ message: "ID de ODS inválido" });
      }
      
      const updated = await storage.assignSdgToPaymentProof(id, parseInt(sdgId));
      if (!updated) {
        return res.status(404).json({ message: "Comprovativo não encontrado" });
      }
      
      // If the payment is already approved, create an investment automatically
      if (updated.status === 'approved') {
        console.log(`Comprovativo ${id} já aprovado e agora com ODS ${sdgId}. Criando investimento...`);
        
        // Get projects for this SDG
        const projectsForSdg = await storage.getProjectsBySDG(parseInt(sdgId));
        
        if (projectsForSdg && projectsForSdg.length > 0) {
          // Use the first project for now
          const project = projectsForSdg[0];
          
          // Create investment
          await storage.createInvestment({
            companyId: updated.companyId,
            projectId: project.id,
            amount: updated.amount,
            paymentProofId: updated.id,
            createdAt: new Date()
          });
          
          console.log(`Investimento criado para o projeto ${project.name}`);
        } else {
          console.log(`Nenhum projeto encontrado para o ODS ${sdgId}`);
        }
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Erro ao atribuir ODS:', error);
      res.status(500).json({ message: "Erro ao atribuir ODS" });
    }
  });

  // Create a project
  app.post("/api/admin/projects", isAdmin, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Imagem do projeto é obrigatória" });
      }
      
      const imageUrl = `/uploads/projects/${req.file.filename}`;
      
      const projectData = {
        name: req.body.name,
        description: req.body.description,
        sdgId: parseInt(req.body.sdgId),
        imageUrl,
        totalInvested: req.body.totalInvested || '0'
      };
      
      // Validate project data
      const validationResult = projectInsertSchema.safeParse(projectData);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: validationResult.error.format() 
        });
      }
      
      const project = await storage.createProject(validationResult.data);
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar projeto" });
    }
  });

  // Update a project
  app.put("/api/admin/projects/:id", isAdmin, upload.single("image"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      console.log("Dados recebidos para atualização:", req.body);
      console.log("Tipo do Content-Type:", req.get('Content-Type'));
      
      let projectData;
      
      // Use o schema de validação para garantir tipos corretos
      try {
        // Validar e transformar os dados usando o schema
        const contentType = req.get('Content-Type') || '';
        
        if (contentType.includes('application/json')) {
          // Para JSON, valide diretamente o corpo
          projectData = projectUpdateSchema.parse(req.body);
          console.log("Dados JSON validados:", projectData);
        } else {
          // Para form-data ou outros tipos, pré-processar os dados
          const rawData: any = {};
          if (req.body.name) rawData.name = req.body.name;
          if (req.body.description) rawData.description = req.body.description;
          if (req.body.sdgId) rawData.sdgId = parseInt(req.body.sdgId);
          if (req.body.totalInvested !== undefined) rawData.totalInvested = req.body.totalInvested;
          
          projectData = projectUpdateSchema.parse(rawData);
          console.log("Dados form validados:", projectData);
        }
        
        // Adicione a imagem se foi enviada
        if (req.file) {
          projectData.imageUrl = `/uploads/projects/${req.file.filename}`;
        }
        
      } catch (error) {
        console.error("Erro na validação dos dados:", error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Dados inválidos para atualização", 
            errors: error.format() 
          });
        }
        throw error;
      }
      
      console.log("Dados finais do projeto a atualizar:", projectData);
      
      if (Object.keys(projectData).length === 0) {
        return res.status(400).json({ message: "Nenhum dado fornecido para atualização" });
      }
      
      const updated = await storage.updateProject(id, projectData);
      if (!updated) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar projeto:", error);
      
      // Log mais detalhado para depuração
      if (error instanceof Error) {
        console.error("Mensagem de erro:", error.message);
        console.error("Stack trace:", error.stack);
      }
      
      res.status(500).json({ message: "Erro ao atualizar projeto: " + (error instanceof Error ? error.message : String(error)) });
    }
  });
  
  // Delete a project
  app.delete("/api/admin/projects/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const result = await storage.deleteProject(id);
      if (!result) {
        return res.status(404).json({ message: "Projeto não encontrado ou não pode ser excluído" });
      }
      
      res.status(200).json({ message: "Projeto excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Erro ao excluir projeto" });
    }
  });

  // Add a project update
  app.post("/api/admin/projects/:id/updates", isAdmin, upload.array("media"), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: "Título e conteúdo são obrigatórios" });
      }
      
      // Process uploaded files
      const mediaUrls = [];
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const fileUrl = `/uploads/projects/${file.filename}`;
          mediaUrls.push(fileUrl);
        }
      }
      
      const updateData = {
        projectId,
        title,
        content,
        mediaUrls
      };
      
      const update = await storage.addProjectUpdate(updateData);
      res.status(201).json(update);
    } catch (error) {
      console.error("Error adding project update:", error);
      res.status(500).json({ message: "Erro ao adicionar atualização" });
    }
  });
  
  // NOVO Endpoint para substituir imagens de uma atualização de projeto
  app.post("/api/admin/project-updates/:id/replace-images", isAdmin, upload.array("media"), async (req, res) => {
    try {
      const updateId = parseInt(req.params.id);
      if (isNaN(updateId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      console.log("\n\n===== REQUISIÇÃO DE IMAGENS RECEBIDA =====");
      console.log("FILES:", req.files ? `${(req.files as any[]).length} arquivo(s)` : "nenhum arquivo");
      console.log("BODY KEYS:", Object.keys(req.body));
      console.log("EXISTING_MEDIA_URLS RAW:", req.body.existingMediaUrls);
      
      // Verificar e imprimir os arquivos recebidos
      if (req.files && Array.isArray(req.files)) {
        console.log("FILE DETAILS:", req.files.map(f => ({
          fieldname: f.fieldname,
          originalname: f.originalname,
          encoding: f.encoding,
          mimetype: f.mimetype,
          destination: f.destination,
          filename: f.filename,
          path: f.path,
          size: f.size
        })));
      }
      
      // Obter a atualização atual
      const currentUpdate = await storage.getProjectUpdateById(updateId);
      if (!currentUpdate) {
        return res.status(404).json({ message: "Atualização não encontrada" });
      }
      
      // Imprimir o estado atual
      console.log("MEDIA_URLS EXISTENTE NO BANCO:", currentUpdate.mediaUrls);
      console.log("TIPO DOS MEDIA_URLS:", typeof currentUpdate.mediaUrls);
      console.log("É ARRAY?", Array.isArray(currentUpdate.mediaUrls));
      
      // Processar a lista de URLs existentes
      let finalMediaUrls: string[] = [];
      
      // Preservar as URLs atuais se nenhuma lista de existingMediaUrls for fornecida
      if (!req.body.existingMediaUrls && Array.isArray(currentUpdate.mediaUrls)) {
        finalMediaUrls = [...currentUpdate.mediaUrls];
        console.log("USANDO URLs EXISTENTES DO BANCO:", finalMediaUrls);
      }
      // Se existingMediaUrls for fornecido, usar essa lista
      else if (req.body.existingMediaUrls) {
        try {
          const existingUrls = JSON.parse(req.body.existingMediaUrls);
          console.log("URLs EXISTENTES PARSEADAS:", existingUrls);
          console.log("TIPO DAS URLs PARSEADAS:", typeof existingUrls);
          console.log("É ARRAY?", Array.isArray(existingUrls));
          
          if (Array.isArray(existingUrls)) {
            finalMediaUrls = [...existingUrls];
          } else {
            console.log("AVISO: existingMediaUrls não é um array!");
            // Se não for array, mas tiver URLs do banco, usar essas
            if (Array.isArray(currentUpdate.mediaUrls)) {
              finalMediaUrls = [...currentUpdate.mediaUrls];
              console.log("USANDO URLs DO BANCO EM FALLBACK:", finalMediaUrls);
            }
          }
        } catch (e) {
          console.error("ERRO AO PROCESSAR URLS:", e);
          // Se houver erro no parsing, tentar usar as URLs do banco
          if (Array.isArray(currentUpdate.mediaUrls)) {
            finalMediaUrls = [...currentUpdate.mediaUrls];
            console.log("USANDO URLs DO BANCO EM FALLBACK DE ERRO:", finalMediaUrls);
          } else {
            return res.status(400).json({ message: "Formato inválido para existingMediaUrls" });
          }
        }
      }
      
      console.log("URLs MANTIDAS APÓS PROCESSAMENTO:", finalMediaUrls);
      
      // Adicionar novos arquivos
      const newMediaUrls: string[] = [];
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        console.log("NOVOS ARQUIVOS:", req.files.map(f => f.filename));
        for (const file of req.files) {
          const fileUrl = `/uploads/projects/${file.filename}`;
          newMediaUrls.push(fileUrl);
        }
      }
      
      console.log("NOVAS URLs:", newMediaUrls);
      
      // Juntar as URLs existentes com as novas
      const allMediaUrls = [...finalMediaUrls, ...newMediaUrls];
      console.log("LISTA FINAL COMPLETA:", allMediaUrls);
      
      // Garantir que temos um array válido para o banco de dados
      const jsonString = JSON.stringify(allMediaUrls);
      console.log("JSON A SER ENVIADO PARA O BANCO:", jsonString);
      
      // Executar a atualização com SQL direto para evitar problemas de tipo
      try {
        // Vamos verificar novamente a string final
        console.log("VERIFICAÇÃO FINAL:");
        console.log("- JSON STRING:", jsonString);
        console.log("- TIPO:", typeof jsonString);
        console.log("- DESCOMPACTANDO PARA VERIFICAR:", JSON.parse(jsonString));
        
        // Garantir que não temos caracteres de escape extras
        const cleanJsonString = JSON.stringify(JSON.parse(jsonString));
        console.log("- JSON STRING LIMPO:", cleanJsonString);
        
        const result = await db.execute(sql`
          UPDATE project_updates 
          SET media_urls = ${cleanJsonString}::jsonb
          WHERE id = ${updateId}
          RETURNING *
        `);
        
        console.log("RESULTADO SQL:", result);
        console.log("LINHAS AFETADAS:", result.rowCount);
        console.log("DADOS RETORNADOS:", result.rows);
      } catch (sqlError) {
        console.error("ERRO NA EXECUÇÃO SQL:", sqlError);
        console.error("DETALHES DO ERRO:", sqlError instanceof Error ? sqlError.message : sqlError);
      }
      
      // Buscar o registro atualizado para confirmar as mudanças
      const updatedUpdate = await storage.getProjectUpdateById(updateId);
      if (!updatedUpdate) {
        return res.status(404).json({ message: "Falha ao buscar atualização após ação" });
      }
      
      console.log("RESULTADO FINAL VERIFICADO:", updatedUpdate.mediaUrls);
      console.log("===== FIM DA REQUISIÇÃO =====\n\n");
      
      res.json(updatedUpdate);
    } catch (error) {
      console.error("Erro ao atualizar imagens:", error);
      res.status(500).json({ message: "Erro ao atualizar imagens da atualização" });
    }
  });

  // Update a project update
  app.put("/api/admin/project-updates/:id", isAdmin, async (req, res) => {
    try {
      const updateId = parseInt(req.params.id);
      if (isNaN(updateId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const { title, content } = req.body;
      
      if (!title && !content) {
        return res.status(400).json({ message: "Título ou conteúdo são obrigatórios" });
      }
      
      // Buscar a atualização atual
      const currentUpdate = await storage.getProjectUpdateById(updateId);
      if (!currentUpdate) {
        return res.status(404).json({ message: "Atualização não encontrada" });
      }
      
      // Atualizar apenas título e conteúdo, deixando as imagens como estão
      const updateData: Record<string, any> = {};
      if (title) updateData.title = title;
      if (content) updateData.content = content;
      
      // Manter explicitamente as imagens existentes (não alterar)
      // updateData.mediaUrls = currentUpdate.mediaUrls || [];
      
      console.log("Dados de atualização (texto):", updateData);
      
      const updatedUpdate = await storage.updateProjectUpdate(updateId, updateData);
      if (!updatedUpdate) {
        return res.status(404).json({ message: "Falha ao atualizar" });
      }
      
      res.json(updatedUpdate);
    } catch (error) {
      console.error("Error updating project update:", error);
      res.status(500).json({ message: "Erro ao atualizar a atualização do projeto" });
    }
  });

  // Create an investment
  app.post("/api/admin/investments", isAdmin, async (req, res) => {
    try {
      const { companyId, projectId, paymentProofId, amount } = req.body;
      
      if (!companyId || !projectId || !paymentProofId || !amount) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios" });
      }
      
      const investment = await storage.createInvestment({
        companyId: parseInt(companyId),
        projectId: parseInt(projectId),
        paymentProofId: parseInt(paymentProofId),
        amount: parseFloat(amount)
      });
      
      res.status(201).json(investment);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar investimento" });
    }
  });
  
  // Rota específica para atualizar apenas o valor investido exibido do projeto
  app.put("/api/admin/projects/:id/investment", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const { totalInvested } = req.body;
      console.log("Atualizando valor investido exibido:", { id, totalInvested });
      
      if (totalInvested === undefined) {
        return res.status(400).json({ message: "Valor investido é obrigatório" });
      }
      
      // Converte para número independente do formato de entrada
      let investedValue: number;
      try {
        // Remove qualquer caractere que não seja número ou ponto
        const cleanValue = String(totalInvested).replace(/[^0-9.]/g, '');
        investedValue = parseFloat(cleanValue);
        
        if (isNaN(investedValue)) {
          return res.status(400).json({ message: "Valor investido inválido" });
        }
      } catch (error) {
        return res.status(400).json({ message: "Erro ao processar valor investido" });
      }
      
      console.log("Valor convertido:", investedValue);
      
      // Verificar se o projeto existe
      const project = await storage.getProjectById(id);
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      
      // Criar ou atualizar o registro na tabela displayInvestments
      const displayInvestment = await storage.createOrUpdateDisplayInvestment(id, investedValue);
      console.log("Valor investido exibido atualizado:", displayInvestment);
      
      // Busca o projeto completo para retornar
      const updatedProject = {
        ...project,
        displayInvestment
      };
      
      res.json(updatedProject);
    } catch (error) {
      console.error("Erro ao atualizar valor investido:", error);
      if (error instanceof Error) {
        console.error("Mensagem de erro:", error.message);
        console.error("Stack trace:", error.stack);
      }
      res.status(500).json({ message: "Erro ao atualizar valor investido" });
    }
  });

  // Rotas para o Leaderboard de Pegada de Carbono
  
  // Obter o leaderboard completo
  app.get("/api/carbon-leaderboard", async (req, res) => {
    try {
      const period = req.query.period as string || 'all_time';
      const leaderboard = await storage.getCarbonLeaderboard(period);
      res.json(leaderboard);
    } catch (error) {
      console.error("Erro ao buscar leaderboard de carbono:", error);
      res.status(500).json({ message: "Erro ao buscar dados do leaderboard" });
    }
  });

  // Obter estatísticas de pegada de carbono para uma empresa específica
  app.get("/api/companies/:id/carbon-stats", async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      if (isNaN(companyId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const stats = await storage.getCompanyCarbonStats(companyId);
      if (!stats) {
        return res.status(404).json({ message: "Estatísticas não encontradas para esta empresa" });
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Erro ao buscar estatísticas de carbono da empresa:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas de carbono" });
    }
  });

  // Atualizar dados de pegada de carbono (protegido para empresas autenticadas)
  app.post("/api/companies/:id/carbon-stats", isCompany, async (req, res) => {
    try {
      // Verificar se o usuário autenticado pertence a esta empresa
      const companyId = parseInt(req.params.id);
      if (isNaN(companyId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Verificar se o usuário tem permissão para atualizar esta empresa
      const userCompany = (req.user as any).company;
      if (!userCompany || userCompany.id !== companyId) {
        return res.status(403).json({ message: "Você não tem permissão para atualizar dados desta empresa" });
      }
      
      // Validar e processar os dados
      const validatedData = carbonLeaderboardInsertSchema.parse({
        ...req.body,
        companyId,
        year: new Date().getFullYear() // Usar o ano atual
      });
      
      // Atualizar os dados no banco
      const updatedStats = await storage.updateCarbonLeaderboard(validatedData);
      
      // Recalcular o ranking
      await storage.calculateCarbonRanking();
      
      res.json(updatedStats);
    } catch (error) {
      console.error("Erro ao atualizar estatísticas de carbono:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Erro ao atualizar estatísticas de carbono" });
    }
  });

  // Rota administrativa para recalcular o ranking (protegida para administradores)
  app.post("/api/admin/carbon-leaderboard/recalculate", isAdmin, async (req, res) => {
    try {
      await storage.calculateCarbonRanking();
      const leaderboard = await storage.getCarbonLeaderboard();
      res.json({ message: "Ranking recalculado com sucesso", leaderboard });
    } catch (error) {
      console.error("Erro ao recalcular ranking:", error);
      res.status(500).json({ message: "Erro ao recalcular ranking" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
