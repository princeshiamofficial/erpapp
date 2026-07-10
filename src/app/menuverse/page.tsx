import { Metadata } from 'next';
import { MultiStepForm } from './MultiStepForm';

export const metadata: Metadata = {
  title: 'MenuVerse Registration | ERP App',
  description: 'Register your restaurant on MenuVerse.',
};

export default function PublicMenuVersePage() {
  return (
    <div className="min-h-screen bg-gray-50/50 flex justify-center pt-0 pb-4 sm:py-6 lg:py-8">
      <div className="max-w-3xl w-full">

        <MultiStepForm />
      </div>
    </div>
  );
}
