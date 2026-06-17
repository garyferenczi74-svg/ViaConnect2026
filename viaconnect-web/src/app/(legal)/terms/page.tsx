import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Terms of Service | ViaConnect" },
  description:
    "The Terms of Service for ViaConnect, operated by Farmceutica Wellness LLC, including the medical disclaimer, genetic testing terms, and dispute resolution.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default function TermsOfServicePage() {
  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">
          ViaConnect Terms of Service
        </h1>
        <p className="text-sm text-gray-400">Operated by Farmceutica Wellness LLC</p>
        <p className="text-sm text-gray-400">Last Updated: June 17, 2026</p>
        <p className="text-sm text-gray-400">Effective Date: June 17, 2026</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">1. Agreement to These Terms</h2>
        <p>
          These Terms of Service (the &quot;Terms&quot;) are a binding agreement between you and Farmceutica Wellness LLC (&quot;Farmceutica&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). They govern your access to and use of the ViaConnect platform, the Via Cura brand and products, the GENEX360 genetic testing suite, and our related websites and applications (together, the &quot;Services&quot;).
        </p>
        <p>
          By creating an account, checking the acceptance box at signup, or using the Services, you agree to these Terms and to our Privacy Policy, which is incorporated by reference. If you do not agree, do not use the Services.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">2. Eligibility</h2>
        <p>
          You must be at least 18 years old and able to form a binding contract to use the Services. By using the Services, you represent that you meet these requirements and that the information you provide is accurate.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">3. What ViaConnect Is, and Important Medical Disclaimer</h2>
        <p>
          ViaConnect is a precision wellness platform. It provides assessments, genetic insights, personalized supplement protocols, tracking tools, analytics such as the Bio Optimization Score, and educational content.
        </p>
        <p>
          The Services are for informational and wellness purposes only. They do not provide medical advice, diagnosis, or treatment. Supplement recommendations, genetic insights, scores, and other outputs are informational and do not replace the advice of a qualified healthcare provider. Always speak with a qualified healthcare provider before starting, stopping, or changing any supplement, medication, or health regimen, and before acting on any information from the Services. Never disregard professional medical advice or delay seeking it because of something you read or received through the Services. If you think you may have a medical emergency, call your local emergency number immediately.
        </p>
        <p>
          The Services do not create a clinician-patient relationship between you and Farmceutica. Where you choose to connect with a practitioner or naturopath through the platform, any clinical relationship is between you and that independent professional.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">4. Accounts and Security</h2>
        <p>
          You are responsible for the accuracy of your account information, for keeping your credentials confidential, and for all activity under your account. Notify us promptly at{" "}
          <a
            href="mailto:info@farmceuticawellness.com"
            className="text-teal hover:underline"
          >
            info@farmceuticawellness.com
          </a>{" "}
          if you suspect unauthorized use. We may suspend or terminate accounts that violate these Terms or that we reasonably believe present a security or legal risk.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">5. Genetic Testing and Genetic Data (GENEX360)</h2>
        <p>
          If you order GENEX360 or upload genetic data, the following applies in addition to our Privacy Policy.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Consent: genetic testing and analysis proceed only after your separate, explicit consent.</li>
          <li>Sample handling: where you order testing, your biological sample is processed by our CLIA-certified laboratory partner for the purpose of producing your results.</li>
          <li>Nature and limits of results: GENEX360 results describe genetic variants and their general associations. They are informational and are not a clinical diagnosis, a prediction of disease, or a guarantee of any health outcome. Genetic science evolves, and interpretations may be updated over time.</li>
          <li>Uploaded raw data: if you upload genetic data generated by another provider, you represent that you have the right to provide it and that it relates to you.</li>
          <li>Withdrawal and deletion: you may withdraw consent and request deletion of genetic data and destruction of any retained sample as described in the Privacy Policy.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">6. Supplements, Peptides, and Product Information</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Via Cura products and any statements about them have not been evaluated as treatments for any disease, and they are not intended to diagnose, treat, cure, or prevent any disease.</li>
          <li>Peptide content within the Services is provided as educational information for qualified practitioners. Peptides are not offered for sale as commercial products through the Services.</li>
          <li>Product formulations, availability, and the catalog may change. Some ingredients may be paused or withdrawn for regulatory-timing reasons, and availability can vary by jurisdiction.</li>
          <li>You are responsible for reviewing product information and for consulting a qualified healthcare provider before use, especially if you are pregnant, nursing, have a medical condition, or take medication.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">7. Memberships, Orders, Billing, and Cancellation</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Memberships and purchases are offered at the prices and on the terms presented at the point of sale.</li>
          <li>Recurring memberships renew automatically until cancelled. You authorize us or our payment processor to charge your payment method on each renewal until you cancel.</li>
          <li>
            You may cancel a recurring membership as described in your account settings or by contacting{" "}
            <a
              href="mailto:info@farmceuticawellness.com"
              className="text-teal hover:underline"
            >
              info@farmceuticawellness.com
            </a>{" "}
            Cancellation stops future renewals and takes effect at the end of the current paid period unless stated otherwise.
          </li>
          <li>
            Refunds and returns are governed by our then-current refund policy and by applicable consumer law.{" "}
            <a
              href="mailto:Payments@farmceuticawellness.com"
              className="text-teal hover:underline"
            >
              Payments@farmceuticawellness.com
            </a>
          </li>
          <li>Taxes, shipping, and applicable fees may apply and will be shown where required.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">8. Practitioner and Naturopath Use</h2>
        <p>
          Practitioners and naturopaths who use the Services agree to use them only for lawful, professional purposes, to access only the data a patient has authorized, and to comply with their own professional, licensing, and privacy obligations. Practitioner access to consumer engagement information is limited to aggregate measures as configured in the platform. Practitioners are independent professionals and are solely responsible for their clinical decisions.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">9. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Use the Services unlawfully or in violation of these Terms.</li>
          <li>Upload data you do not have the right to provide, or that relates to another person without authorization.</li>
          <li>Attempt to access accounts, data, or systems without authorization, or probe, scan, or test the security of the Services.</li>
          <li>Interfere with or disrupt the integrity or performance of the Services.</li>
          <li>Reverse engineer, scrape, or copy the Services except as permitted by law.</li>
          <li>Misrepresent your identity or your professional credentials.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">10. Your Content and Licenses</h2>
        <p>
          You retain ownership of the information and content you submit. You grant Farmceutica a limited license to host, process, and use that information solely to provide and improve the Services and as described in the Privacy Policy. You are responsible for the accuracy and legality of the content you submit.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">11. Intellectual Property</h2>
        <p>
          The Services, including the ViaConnect platform, the Via Cura and GENEX360 brands, the Bio Optimization Score methodology, software, text, graphics, and design, are owned by or licensed to Farmceutica and are protected by intellectual property laws. We grant you a limited, revocable, non-transferable license to use the Services for your personal, non-commercial use, or for practitioners, for permitted professional use. No other rights are granted.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">12. Third-Party Services</h2>
        <p>
          The Services may link to or integrate with third-party services, such as connected devices, payment processors, and laboratory partners. We are not responsible for third-party services, and your use of them is governed by their own terms and privacy policies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">13. Automated and AI-Generated Outputs</h2>
        <p>
          Some outputs are generated by automated systems, including AI agents. These outputs may contain errors or omissions, are informational only, and are not medical advice. You are responsible for evaluating outputs and for seeking professional advice before acting on them.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">14. Assumption of Risk</h2>
        <p>
          You understand that wellness, nutrition, supplementation, and exercise carry inherent risks, and that genetic insights have limits. You assume responsibility for decisions you make based on the Services and agree to consult a qualified healthcare provider as appropriate.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">15. Disclaimers of Warranties</h2>
        <p>
          The Services are provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the fullest extent permitted by law, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, accuracy, and non-infringement. We do not warrant that the Services will be uninterrupted, error free, or that any output will achieve a particular result. Some jurisdictions do not allow the exclusion of certain warranties, so some of these exclusions may not apply to you.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">16. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Farmceutica and its officers, employees, and partners will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of data, profits, or goodwill, arising from your use of the Services. To the fullest extent permitted by law, our total liability for any claim relating to the Services will not exceed the greater of the amount you paid us in the twelve months before the claim or one hundred dollars. Some jurisdictions do not allow certain limitations, so some of these limitations may not apply to you. Nothing in these Terms limits liability that cannot be limited by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">17. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Farmceutica and its officers, employees, and partners from claims, losses, and expenses, including reasonable legal fees, arising from your misuse of the Services, your violation of these Terms, or your violation of any law or the rights of a third party.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">18. Termination</h2>
        <p>
          You may stop using the Services and close your account at any time. We may suspend or terminate your access if you violate these Terms, if required by law, or to protect the Services or other users. Provisions that by their nature should survive termination will survive, including Sections 11, and 15 through 19.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">19. Governing Law and Dispute Resolution</h2>

        <h3 className="text-lg font-semibold text-white">19.1 Governing law</h3>
        <p>
          These Terms, and any dispute arising out of or relating to these Terms or the Services, are governed by the laws of the State of New York and applicable United States federal law, without regard to conflict-of-laws principles. The United Nations Convention on Contracts for the International Sale of Goods does not apply. This choice of law does not deprive you of the protection of any mandatory consumer-protection provisions of the law of the country, state, or province where you reside that cannot be waived by agreement.
        </p>

        <h3 className="text-lg font-semibold text-white">19.2 Informal resolution first</h3>
        <p>
          Before starting an arbitration or court proceeding, you agree to first try to resolve the dispute informally. Send a written notice of dispute to{" "}
          <a
            href="mailto:info@farmceuticawellness.com"
            className="text-teal hover:underline"
          >
            info@farmceuticawellness.com
          </a>{" "}
          that describes the issue and the relief you seek. You and Farmceutica will then have 60 days from receipt of that notice to reach a resolution. This informal step is a condition that must be met before either party starts a formal proceeding, and any applicable limitation period is paused while the parties pursue it in good faith.
        </p>

        <h3 className="text-lg font-semibold text-white">19.3 Binding individual arbitration</h3>
        <p>
          If the dispute is not resolved within the 60-day informal period, and to the fullest extent permitted by applicable law, you and Farmceutica agree to resolve it by binding individual arbitration rather than in court, except as provided in Section 19.5. The arbitration will be administered by the American Arbitration Association (the &quot;AAA&quot;) under its Consumer Arbitration Rules then in effect. The seat of the arbitration is New York, New York, and the arbitration may be conducted by video or at a mutually convenient location. The arbitrator has authority to resolve disputes about the interpretation, applicability, or enforceability of this arbitration agreement, except that a court of competent jurisdiction, and not an arbitrator, decides whether the waiver in Section 19.4 is enforceable. Judgment on the award may be entered in any court of competent jurisdiction.
        </p>

        <h3 className="text-lg font-semibold text-white">19.4 Class-action and jury-trial waiver</h3>
        <p>
          To the fullest extent permitted by applicable law, you and Farmceutica agree that each may bring claims against the other only in an individual capacity, and not as a plaintiff or class member in any purported class, collective, consolidated, or representative proceeding. The arbitrator may not consolidate more than one person&apos;s claims and may not preside over any form of representative or class proceeding. You and Farmceutica also waive any right to a trial by jury. If this waiver is found unenforceable as to a particular claim or request for relief, that claim or request will be severed and heard in a court of competent jurisdiction described in Section 19.6, while the remaining claims proceed in arbitration.
        </p>

        <h3 className="text-lg font-semibold text-white">19.5 Exceptions</h3>
        <p>
          Either party may bring an individual claim in small-claims court if the claim qualifies. Either party may also seek injunctive or other equitable relief in court to protect its intellectual property or confidential information. Nothing in this Section requires arbitration of any claim that applicable law does not permit to be arbitrated.
        </p>

        <h3 className="text-lg font-semibold text-white">19.6 Forum for court proceedings</h3>
        <p>
          For any dispute that is not subject to arbitration, or if the arbitration agreement is found not to apply, you and Farmceutica submit to the exclusive jurisdiction of the state and federal courts located in Erie County, New York, and waive any objection to venue or to an inconvenient forum in those courts, to the extent permitted by law.
        </p>

        <h3 className="text-lg font-semibold text-white">19.7 Right to opt out of arbitration</h3>
        <p>
          You may opt out of the arbitration agreement in Sections 19.3 and 19.4 by sending written notice to{" "}
          <a
            href="mailto:info@farmceuticawellness.com"
            className="text-teal hover:underline"
          >
            info@farmceuticawellness.com
          </a>{" "}
          within 30 days after you first accept these Terms. The notice must include your name, the email associated with your account, and a clear statement that you opt out of arbitration. If you opt out, the court-forum provision in Section 19.6 governs your disputes. Opting out does not affect any other part of these Terms.
        </p>

        <h3 className="text-lg font-semibold text-white">19.8 Changes to this Section</h3>
        <p>
          If we make a material change to this Section after you accept these Terms, you may reject the change by sending written notice to{" "}
          <a
            href="mailto:info@farmceuticawellness.com"
            className="text-teal hover:underline"
          >
            info@farmceuticawellness.com
          </a>{" "}
          within 30 days of the change, in which case the most recent version of this Section before the change applies to you.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">20. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. When we make material changes, we will update the Last Updated date and, where required, notify you. Your continued use of the Services after an update means you accept the revised Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">21. General</h2>
        <p>
          These Terms, together with the Privacy Policy and any policies referenced at the point of sale, are the entire agreement between you and Farmceutica regarding the Services. If any provision is held unenforceable, the rest remains in effect. Our failure to enforce a provision is not a waiver. You may not assign these Terms without our consent; we may assign them in connection with a business transfer.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">22. Contact</h2>
        <p>Questions about these Terms can be sent to:</p>
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
