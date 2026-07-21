import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-32 text-center min-h-[70vh] flex flex-col items-center justify-center">
      <h1 className="text-8xl font-serif font-bold text-primary mb-6">404</h1>
      <h2 className="text-3xl font-bold text-secondary dark:text-white mb-4">Page not found</h2>
      <p className="text-muted-foreground text-lg max-w-md mx-auto mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link href="/" className="bg-primary text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-primary/90 transition-all hover:-translate-y-1">
        Return Home
      </Link>
    </div>
  );
}