import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy | ViaConnect" },
  description:
    "How ViaConnect, operated by Farmceutica Wellness LLC, collects, uses, shares, and protects your personal, health, and genetic information.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">
          ViaConnect Privacy Policy
        </h1>
        <p className="text-sm text-gray-400">Operated by Farmceutica Wellness LLC</p>
        <p className="text-sm text-gray-400">Last Updated: June 17, 2026</p>
        <p className="text-sm text-gray-400">Effective Date: June 17, 2026</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">1. Introduction</h2>
        <p>
          Farmceutica Wellness LLC (&quot;Farmceutica&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the ViaConnect precision wellness platform, the Via Cura consumer supplement brand, and the GENEX360 genetic testing suite (together, the &quot;Services&quot;). This Privacy Policy explains what information we collect, how and why we use it, who we share it with, how long we keep it, and the rights and choices you have.
        </p>
        <p>
          We know the information you share with ViaConnect is sensitive. It can include your health history, your reported symptoms, your laboratory values, your body measurements and photos, and your genetic information. We treat that information with the care it deserves, and this policy is written to tell you plainly how we handle it.
        </p>
        <p>
          By creating an account or using the Services, you acknowledge that you have read this Privacy Policy. Where the law requires your consent for specific processing, such as the processing of genetic information, we will ask for that consent separately and explicitly.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">2. Who We Are and How to Contact Us</h2>
        <p>
          Farmceutica Wellness LLC is the controller responsible for the personal information processed through the Services.
        </p>
        <p>Registered entity: Farmceutica Wellness LLC</p>
        <p>Registered address: 60 Lakefront Blvd, Suite 120, Buffalo, NY, 14202</p>
        <p>
          Privacy contact:{" "}
          <a
            href="mailto:info@farmceuticawellness.com"
            className="text-teal hover:underline"
          >
            info@farmceuticawellness.com
          </a>
        </p>
        <p>
          Data protection contact: Gary Ferenczi{" "}
          <a
            href="mailto:gary@farmceuticawellness.com"
            className="text-teal hover:underline"
          >
            gary@farmceuticawellness.com
          </a>
        </p>
        <p>
          If you are in the European Economic Area or the United Kingdom, see Section 14 for our representative and lawful basis details. If you are in Canada, see Section 15. If you are a California resident, see Section 16.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">3. Scope of This Policy</h2>
        <p>This Policy applies to personal information we process when you:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Visit our marketing pages and create or attempt to create an account.</li>
          <li>Complete the Comprehensive Assessment Questionnaire (the &quot;CAQ&quot;) and use your wellness dashboard.</li>
          <li>Order, register, or upload results for GENEX360 genetic testing, or upload raw genetic data generated elsewhere.</li>
          <li>Use logging and tracking features, including nutrition logging, hydration, body measurements, and progress photos.</li>
          <li>Purchase Via Cura products or manage a membership.</li>
          <li>Connect a wearable or third-party health data source.</li>
          <li>Interact with a practitioner or naturopath through the platform.</li>
          <li>Contact our support team.</li>
        </ul>
        <p>
          This Policy does not cover the independent privacy practices of third parties whose services you choose to connect, or of practitioners and naturopaths who use the platform under their own privacy obligations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">4. Information We Collect</h2>

        <h3 className="text-lg font-semibold text-white">4.1 Information you provide directly</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Account information: email address and password credentials.</li>
          <li>Profile and demographic information: name, date of birth, sex assigned at birth, gender where you choose to provide it, and contact details.</li>
          <li>Health information from the CAQ: health history, reported physical, neurological, and emotional symptoms, medications, supplements, and lifestyle inputs.</li>
          <li>Laboratory information: lab values you enter or upload.</li>
          <li>Body and lifestyle tracking: weight, body composition, measurements, hydration, nutrition logs, and progress photos.</li>
          <li>Genetic information: GENEX360 panel results and, where you choose to upload it, raw genetic data files produced by other testing providers. See Section 5 for the special handling that applies to this category.</li>
          <li>Payment information: processed by our payment provider. We do not store full card numbers on our systems.</li>
          <li>Communications: messages you send to support or to a connected practitioner or naturopath.</li>
        </ul>

        <h3 className="text-lg font-semibold text-white">4.2 Information we collect automatically</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Device and usage information: device type, operating system, browser, app version, IP address, and interactions with features.</li>
          <li>Cookies and similar technologies: see Section 11.</li>
        </ul>

        <h3 className="text-lg font-semibold text-white">4.3 Information we receive from third parties</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Laboratory partners: when you order GENEX360, our CLIA-certified laboratory partner Genemetric Inc processes your biological sample and returns results to the Services.</li>
          <li>Connected devices and apps: where you authorize a connection, we receive data such as activity, sleep, and other metrics.</li>
          <li>Practitioners and naturopaths: where you share your protocol with a clinician and they add notes or recommendations.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">5. Genetic Information: Special Handling</h2>
        <p>
          Genetic information is among the most sensitive categories of personal information, and we apply heightened protections to it.
        </p>

        <h3 className="text-lg font-semibold text-white">5.1 Consent</h3>
        <p>
          We collect, analyze, and store genetic information only with your separate, explicit, opt-in consent. You provide this consent before any genetic data is uploaded or before a GENEX360 sample is analyzed. You may withdraw that consent at any time as described in Section 5.5.
        </p>

        <h3 className="text-lg font-semibold text-white">5.2 How we use genetic information</h3>
        <p>
          We use your genetic information solely to provide the Services you have asked for. That includes analyzing variants across the GENEX360 panels, generating and refining your supplement protocol, performing interaction and safety checks, and presenting your variant explorer and related insights.
        </p>

        <h3 className="text-lg font-semibold text-white">5.3 What we do not do with genetic information</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>We do not sell your genetic information.</li>
          <li>We do not use your genetic information for advertising, and we do not allow third parties to do so.</li>
          <li>We do not disclose your genetic information to employers, life insurers, disability insurers, or long-term care insurers.</li>
          <li>We do not use your genetic information for research unless you give a separate, specific, and revocable consent for that use, and any such use is on a de-identified basis.</li>
        </ul>

        <h3 className="text-lg font-semibold text-white">5.4 Laboratory processing</h3>
        <p>
          Where you order GENEX360, your biological sample is processed by our CLIA-certified laboratory partner under a written agreement that restricts the partner to processing the sample for the purpose of returning your results and prohibits unauthorized use or disclosure.
        </p>

        <h3 className="text-lg font-semibold text-white">5.5 Withdrawal, deletion, and sample destruction</h3>
        <p>
          You may withdraw your consent to genetic processing and request deletion of your genetic information and the destruction of any retained biological sample at any time, by contacting us at{" "}
          <a
            href="mailto:info@farmceuticawellness.com"
            className="text-teal hover:underline"
          >
            info@farmceuticawellness.com
          </a>{" "}
          or through your account settings where available. We will honor the request subject to any legal or laboratory accreditation retention obligation, and we will tell you if any such obligation applies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">6. How We Use Your Information</h2>
        <p>We use personal information to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Create and secure your account and verify your identity.</li>
          <li>Generate your Bio Optimization Score, your supplement protocol, and your wellness analytics.</li>
          <li>Perform medication, supplement, and herbal interaction and safety checks.</li>
          <li>Provide nutrition, hydration, body, and progress tracking features.</li>
          <li>Fulfill Via Cura product orders and manage memberships and billing.</li>
          <li>Enable you to share data with, and communicate with, a practitioner or naturopath at your direction.</li>
          <li>Operate, maintain, secure, and improve the Services.</li>
          <li>Communicate with you about the Services, including service and transactional messages.</li>
          <li>Comply with legal obligations and enforce our terms.</li>
        </ul>

        <h3 className="text-lg font-semibold text-white">6.1 Automated and AI processing</h3>
        <p>
          The Services use automated systems, including AI reasoning agents, to analyze the information you provide and to generate personalized recommendations such as your protocol and your Bio Optimization Score. These outputs are informational and are not a medical diagnosis or a substitute for professional medical advice. You can contact us to ask questions about how an automated output was generated.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">7. How We Share Your Information</h2>
        <p>We share personal information only as described here.</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Service providers: we use vetted providers for hosting, database, infrastructure, payment processing, communications, and analytics. They process information on our instructions under contracts that protect it. This includes our cloud database and hosting providers.</li>
          <li>Laboratory partner: as described in Section 5.4, for GENEX360 sample processing.</li>
          <li>Practitioners and naturopaths: only where you choose to share, and only the data scope you authorize. Access is role locked.</li>
          <li>Legal and safety: where required by law, valid legal process, or to protect the rights, safety, and property of users, the public, or Farmceutica.</li>
          <li>Business transfers: in connection with a merger, acquisition, financing, or sale of assets, subject to the protections in this Policy. We will notify you of any change in control of your personal information.</li>
        </ul>
        <p>
          We do not sell your personal information, and we do not share it for cross-context behavioral advertising.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">8. Data Retention</h2>
        <p>
          We keep personal information for as long as your account is active and for as long as needed to provide the Services, then for the period required to meet legal, accounting, accreditation, or dispute-resolution obligations. Genetic information and biological samples are retained only as described in Section 5 and are deleted or destroyed on valid request, subject to any retention obligation we are required to meet. When information is no longer needed, we delete it or de-identify it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">9. How We Protect Your Information</h2>
        <p>
          We maintain administrative, technical, and physical safeguards designed to protect personal information, including encryption in transit, access controls, role-based permissions, and monitoring. The platform is designed to be HIPAA-aware in its handling of health information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security. If we become aware of a breach affecting your personal information, we will notify you and the relevant authorities as required by applicable law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">10. Your Rights and Choices</h2>
        <p>Depending on where you live, you may have the right to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Access the personal information we hold about you.</li>
          <li>Correct inaccurate or incomplete information.</li>
          <li>Delete your personal information.</li>
          <li>Receive a portable copy of certain information.</li>
          <li>Withdraw consent, including consent to genetic processing.</li>
          <li>Object to or restrict certain processing.</li>
          <li>Be free from discrimination for exercising your rights.</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a
            href="mailto:info@farmceuticawellness.com"
            className="text-teal hover:underline"
          >
            info@farmceuticawellness.com
          </a>{" "}
          or use the controls in your account settings. We will verify your identity before acting on a request. We will respond within the timeframe required by applicable law. You also have the right to lodge a complaint with your local data protection authority.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">11. Cookies and Similar Technologies</h2>
        <p>
          We use cookies and similar technologies to keep you signed in, remember your preferences, secure the Services, and understand how the Services are used. You can control cookies through your browser settings. Some features may not function correctly if you disable certain cookies. Where required, we will request your consent before setting non-essential cookies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">12. International Data Transfers</h2>
        <p>
          Farmceutica operates and works with partners and facilities in multiple countries, which may include the United States, the European Union (including Croatia), and Canada. When we transfer personal information across borders, we use safeguards required by applicable law, such as standard contractual clauses, to protect it. See Sections 14 and 15 for region-specific details.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">13. Children</h2>
        <p>
          The Services are intended for adults aged 18 and over. We do not knowingly collect personal information from anyone under 18. If you believe a minor has provided us with personal information, contact us at{" "}
          <a
            href="mailto:info@farmceuticawellness.com"
            className="text-teal hover:underline"
          >
            info@farmceuticawellness.com
          </a>{" "}
          and we will delete it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">14. Notice for the European Economic Area and United Kingdom</h2>
        <p>If you are in the EEA or the UK, the following applies.</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Controller: Farmceutica Wellness LLC. EEA or UK representative: Gary Ferenczi{" "}
            <a
              href="mailto:gary@farmceuticawellness.com"
              className="text-teal hover:underline"
            >
              gary@farmceuticawellness.com
            </a>
          </li>
          <li>Lawful bases: we rely on your consent for genetic and other special-category health data; on performance of a contract to provide the Services you request; on our legitimate interests to operate and secure the Services; and on legal obligation where applicable.</li>
          <li>Special category data: health and genetic data are special category data. We process them based on your explicit consent under Article 9.</li>
          <li>Your rights: in addition to the rights in Section 10, you may withdraw consent at any time without affecting prior lawful processing, and you may complain to your supervisory authority.</li>
          <li>Transfers: where we transfer data outside the EEA or UK, we use standard contractual clauses or another approved mechanism.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">15. Notice for Canada</h2>
        <p>
          If you are in Canada, we handle personal information in accordance with the Personal Information Protection and Electronic Documents Act and applicable provincial laws, including those of Alberta. We collect, use, and disclose personal information only for the purposes identified in this Policy and with your consent, and you may withdraw consent subject to legal and contractual restrictions. You may direct questions or complaints to our privacy contact in Section 2, and you may contact the Office of the Privacy Commissioner of Canada or your provincial commissioner.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">16. Notice for California Residents</h2>
        <p>
          If you are a California resident, you have the rights described in Section 10, including the right to know, the right to delete, the right to correct, and the right to limit the use of sensitive personal information. We collect the categories of personal information described in Section 4, including sensitive personal information such as health and genetic information, which we use only to provide the Services and not for purposes that would require an opt-out right. We do not sell or share personal information as those terms are defined under California law. To exercise your rights, contact us at{" "}
          <a
            href="mailto:info@farmceuticawellness.com"
            className="text-teal hover:underline"
          >
            info@farmceuticawellness.com
          </a>
          {" "}. We will not discriminate against you for exercising your rights.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">17. Changes to This Policy</h2>
        <p>
          We may update this Policy from time to time. When we make material changes, we will update the Last Updated date and, where required, notify you or seek your consent. Your continued use of the Services after an update means you acknowledge the revised Policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">18. How to Reach Us</h2>
        <p>
          Questions, requests, or complaints about this Policy or our handling of your information can be sent to:
        </p>
        <p>Farmceutica Wellness LLC</p>
        <p>60 Lakefront Blvd, Suite 120, Buffalo, NY, 14202</p>
        <p>
          <a
            href="mailto:info@farmceuticawellness.com"
            className="text-teal hover:underline"
          >
            info@farmceuticawellness.com
          </a>
        </p>
      </section>
    </article>
  );
}
