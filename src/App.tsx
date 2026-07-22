import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NGOAuth from "./pages/NGOAuth";
import DonorAuth from "./pages/DonorAuth";
import DonorProfile from "./pages/DonorProfile";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/ngo/auth" element={<NGOAuth />} />
        <Route path="/donor/auth" element={<DonorAuth />} />
        <Route path="/donor/profile" element={<DonorProfile />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
