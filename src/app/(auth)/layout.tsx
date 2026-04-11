export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // color-banner-dark (#171717) base — dark surface token
    // The background photo in each page sits on top of this via absolute positioning
    <div className="min-h-screen bg-[#171717] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}