// app/legal/page.tsx
"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/ui/footer";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Create a client component that uses useSearchParams
function LegalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'cookies'>('terms');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['terms', 'privacy', 'cookies'].includes(tabParam)) {
      setActiveTab(tabParam as 'terms' | 'privacy' | 'cookies');
    }
  }, [searchParams]);

  return (
    <div className="max-w-4xl mx-auto">
      {/*   
      // Back button and navigation
          <div className="mb-6">
            <Button variant="outline" onClick={() => router.back()} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </div> 
      */}

      <Card className="bg-[var(--card)] border-[var(--border)] mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-[var(--foreground)]">
            Legal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tabs for the different legal pages */}
          <div className="mb-6 border-b border-[var(--border)]">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('terms')}
                className={`pb-2 px-1 ${activeTab === 'terms'
                  ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)]'}`}
              >
                Terms & Conditions
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`pb-2 px-1 ${activeTab === 'privacy'
                  ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)]'}`}
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setActiveTab('cookies')}
                className={`pb-2 px-1 ${activeTab === 'cookies'
                  ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)]'}`}
              >
                Cookie Policy
              </button>
            </div>
          </div>

          {/* Content for Terms & Conditions */}
          {activeTab === 'terms' && (
            <div className="text-[var(--foreground)] space-y-4">
              <h2 className="text-xl font-semibold mb-4">Terms & Conditions</h2>
              <p className="text-sm">Last Updated: March 21, 2025</p>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">1. Introduction</h3>
                <p>Welcome to Town Hall ("we," "our," or "us"). By accessing or using our service, you agree to be bound by these Terms & Conditions. If you disagree with any part of these terms, you may not access the service.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">2. User Accounts</h3>
                <p>2.1. You must complete the registration process by providing your current, complete, and accurate information as prompted by the registration form.</p>
                <p>2.2. You are responsible for maintaining the confidentiality of your account and password and for restricting access to your account.</p>
                <p>2.3. Town Hall requires identity verification via government-issued ID to ensure real-name participation. This is to maintain community trust and accountability.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">3. Community Standards</h3>
                <p>3.1. Users are expected to engage respectfully with others in the community.</p>
                <p>3.2. Posts must be relevant to the geographic community they are posted in.</p>
                <p>3.3. Content that violates our community guidelines, including but not limited to hate speech, threats, harassment, or spam, may be removed.</p>
                <p>3.4. User accounts may be suspended or terminated for repeated violations of these standards.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">4. Content</h3>
                <p>4.1. By posting content on Town Hall, you grant us a non-exclusive, royalty-free license to use, reproduce, and display such content in connection with the service.</p>
                <p>4.2. You represent and warrant that you own or have the necessary licenses, rights, consents, and permissions to publish the content you post.</p>
                <p>4.3. Emergency alerts may only be posted by verified officials with appropriate permissions.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">5. Geographic Restrictions</h3>
                <p>Town Hall communities are geographically restricted to promote local discussion and engagement. Users must provide proof of residence to join specific communities.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">6. Termination</h3>
                <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including without limitation if you breach the Terms.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">7. Limitations of Liability</h3>
                <p>In no event shall Town Hall, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">8. Changes</h3>
                <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. It is your responsibility to review these Terms periodically for changes.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">9. Contact Us</h3>
                <p>If you have any questions about these Terms, please contact us at support@townhall-example.com</p>
              </section>
            </div>
          )}

          {/* Content for Privacy Policy */}
          {activeTab === 'privacy' && (
            <div className="text-[var(--foreground)] space-y-4">
              <h2 className="text-xl font-semibold mb-4">Privacy Policy</h2>
              <p className="text-sm">Last Updated: March 21, 2025</p>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">1. Introduction</h3>
                <p>Town Hall ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">2. Information We Collect</h3>
                <p>2.1. <span className="font-medium">Personal Information:</span> Name, email address, phone number, date of birth, government identification, and address for verification purposes.</p>
                <p>2.2. <span className="font-medium">Profile Information:</span> Profile photos, bio, and community memberships.</p>
                <p>2.3. <span className="font-medium">Content:</span> Posts, comments, and votes you create, submit, or publish.</p>
                <p>2.4. <span className="font-medium">Usage Data:</span> Information about how you use our service, including log data, device information, and IP address.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">3. How We Use Your Information</h3>
                <p>3.1. To verify your identity and residence for community access.</p>
                <p>3.2. To provide and maintain our service, including to monitor usage.</p>
                <p>3.3. To manage your account and provide support.</p>
                <p>3.4. To enable community features such as posting, commenting, and voting.</p>
                <p>3.5. To send you notifications about activity in your communities.</p>
                <p>3.6. To enforce our terms, conditions, and policies.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">4. Disclosure of Your Information</h3>
                <p>4.1. <span className="font-medium">Community Visibility:</span> Your name, profile photo, and posts will be visible to members of communities you join.</p>
                <p>4.2. <span className="font-medium">Service Providers:</span> We may share information with third-party vendors who provide services on our behalf.</p>
                <p>4.3. <span className="font-medium">Legal Requirements:</span> We may disclose information if required to do so by law or in response to valid requests by public authorities.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">5. Security of Your Information</h3>
                <p>We use appropriate technical and organizational measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">6. ID Verification Security</h3>
                <p>Government ID documents are processed securely for verification purposes. After verification is complete, sensitive document data is redacted and originals are not stored longer than necessary for verification purposes.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">7. Children's Privacy</h3>
                <p>Our service is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from children under 18.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">8. Your Rights</h3>
                <p>Depending on your location, you may have rights regarding your personal information, such as the right to access, correct, or delete your data.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">9. Changes to This Privacy Policy</h3>
                <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">10. Contact Us</h3>
                <p>If you have any questions about this Privacy Policy, please contact us at privacy@townhall-example.com</p>
              </section>
            </div>
          )}

          {/* Content for Cookie Policy */}
          {activeTab === 'cookies' && (
            <div className="text-[var(--foreground)] space-y-4">
              <h2 className="text-xl font-semibold mb-4">Cookie Policy</h2>
              <p className="text-sm">Last Updated: March 21, 2025</p>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">1. What Are Cookies</h3>
                <p>Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">2. How We Use Cookies</h3>
                <p>2.1. <span className="font-medium">Essential Cookies:</span> Required for the operation of our service. They enable core functionality such as security, authentication, and session management.</p>
                <p>2.2. <span className="font-medium">Preference Cookies:</span> Allow us to remember choices you make (such as your username, language preference, or theme) and provide enhanced, personalized features.</p>
                <p>2.3. <span className="font-medium">Analytics Cookies:</span> Help us understand how visitors interact with our service, allowing us to improve functionality and user experience.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">3. Types of Cookies We Use</h3>
                <p>3.1. <span className="font-medium">Session Cookies:</span> Temporary cookies that remain on your device until you leave the service.</p>
                <p>3.2. <span className="font-medium">Persistent Cookies:</span> Remain on your device for a set period or until you delete them manually.</p>
                <p>3.3. <span className="font-medium">Third-Party Cookies:</span> Set by third-party services that appear on our pages, such as analytics services.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">4. Specific Cookies We Use</h3>
                <table className="w-full border-collapse border border-[var(--border)]">
                  <thead>
                    <tr className="bg-[var(--muted)]">
                      <th className="border border-[var(--border)] p-2 text-left">Cookie Name</th>
                      <th className="border border-[var(--border)] p-2 text-left">Purpose</th>
                      <th className="border border-[var(--border)] p-2 text-left">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-[var(--border)] p-2">auth_session</td>
                      <td className="border border-[var(--border)] p-2">Authentication and session management</td>
                      <td className="border border-[var(--border)] p-2">Session</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--border)] p-2">theme_preference</td>
                      <td className="border border-[var(--border)] p-2">Stores user theme preference (light/dark)</td>
                      <td className="border border-[var(--border)] p-2">1 year</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--border)] p-2">sidebar_collapsed</td>
                      <td className="border border-[var(--border)] p-2">Remembers sidebar collapsed state</td>
                      <td className="border border-[var(--border)] p-2">1 year</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--border)] p-2">selected_community</td>
                      <td className="border border-[var(--border)] p-2">Remembers user's last selected community</td>
                      <td className="border border-[var(--border)] p-2">1 year</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--border)] p-2">_ga (Google Analytics)</td>
                      <td className="border border-[var(--border)] p-2">Statistical analysis of site usage</td>
                      <td className="border border-[var(--border)] p-2">2 years</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">5. Managing Cookies</h3>
                <p>Most web browsers allow you to control cookies through their settings preferences. However, limiting cookies may affect the functionality of our service.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">6. Changes to This Cookie Policy</h3>
                <p>We may update our Cookie Policy from time to time. We will notify you of any changes by posting the new Cookie Policy on this page.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-medium">7. Contact Us</h3>
                <p>If you have any questions about our Cookie Policy, please contact us at cookies@townhall-example.com</p>
              </section>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Loading component for Suspense fallback
function LegalPageLoading() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="bg-[var(--card)] border-[var(--border)] mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-[var(--foreground)]">
            Loading Legal Information...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="animate-pulse text-[var(--muted-foreground)]">Loading content...</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main page component that wraps the content with Suspense
export default function LegalPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="flex-grow p-6">
        <Suspense fallback={<LegalPageLoading />}>
          <LegalContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}