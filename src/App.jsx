import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import AppLayout from '@/components/layout/AppLayout';
import Compiler from '@/pages/Compiler';
import PipelineViz from '@/pages/PipelineViz';
import Evaluation from '@/pages/Evaluation';
import History from '@/pages/History';
import Runtime from '@/pages/Runtime';
import { Toaster as SonnerToaster } from 'sonner';

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Compiler />} />
            <Route path="/pipeline-viz" element={<PipelineViz />} />
            <Route path="/evaluation" element={<Evaluation />} />
            <Route path="/history" element={<History />} />
            <Route path="/runtime" element={<Runtime />} />
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
      <Toaster />
      <SonnerToaster position="bottom-right" />
    </QueryClientProvider>
  )
}

export default App