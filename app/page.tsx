import Link from 'next/link';
import { ContentRegistry } from '@/lib/core/content-types';

export default function LandingPage() {
  // Convert our centralized registry object into an array so we can map over it
  const contentTypes = Object.values(ContentRegistry);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 font-sans selection:bg-blue-100">
      
      {/* Hero Section */}
      <div className="max-w-3xl text-center mb-14 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <h1 className="text-[2.75rem] font-extrabold text-gray-900 tracking-tight mb-5 leading-tight">
          What are we creating today?
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Select a content format. The AI will automatically adjust its reasoning, writing style, and the visual canvas to match your choice.
        </p>
      </div>

      {/* Dynamic Grid of Content Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {contentTypes.map((type, index) => {
          
          // The reusable Card UI (used for both active and disabled states)
          const CardContent = (
            <div className={`relative h-full bg-white rounded-2xl border ${
                type.isDisabled 
                  ? 'border-gray-200 opacity-60 bg-gray-50/50' 
                  : 'border-gray-200 hover:border-blue-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 cursor-pointer'
              } p-8 flex flex-col items-start text-left group overflow-hidden`}
            >
              
              {/* Icon Container */}
              <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl mb-6 shadow-sm group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                {type.icon}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {type.name}
              </h3>
              
              <p className="text-sm text-gray-500 leading-relaxed mb-8">
                {type.description}
              </p>

              {/* Dynamic Spec Badges */}
              <div className="mt-auto flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-md flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                  {type.canvasConstraints.width} × {type.canvasConstraints.minHeight}
                </span>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  AI Context Optimized
                </span>
              </div>

              {/* Disabled "Coming Soon" Overlay Badge */}
              {type.isDisabled && (
                <div className="absolute top-6 right-6 px-3 py-1 bg-gray-200 text-gray-600 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">
                  Coming Soon
                </div>
              )}
            </div>
          );

          // Render Logic: Wrap active cards in a Link that points to our dynamic route
          return (
            <div 
              key={type.id} 
              className="animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards"
              style={{ animationDelay: `${index * 100}ms` }} // Staggered entrance animation
            >
              {type.isDisabled ? (
                <div className="cursor-not-allowed h-full">
                  {CardContent}
                </div>
              ) : (
                <Link 
                  href={`/editor/${type.id}`} 
                  className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl"
                >
                  {CardContent}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}