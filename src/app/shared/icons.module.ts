import { NgModule } from '@angular/core';

import { LucideAngularModule, Camera, Heart, Github, X, XCircle, Info, Download, RefreshCw, EyeOff, MapPin, ExternalLink, ArrowUpDown, Eraser, Sigma, BookOpen, Play, Pencil, ChevronDown, ChevronUp } from 'lucide-angular';

const icons = {
  Camera,
  Heart,
  Github,
  X,
  XCircle,
  Info,
  Download,
  RefreshCw,
  EyeOff,
  MapPin,
  ExternalLink,
  ArrowUpDown,
  Eraser,
  Sigma,
  BookOpen,
  Play,
  Pencil,
  ChevronDown,
  ChevronUp,
};

@NgModule({
  imports: [LucideAngularModule.pick(icons)],
  exports: [LucideAngularModule],
})
export class IconsModule {}
