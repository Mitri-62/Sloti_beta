// src/vitrine/components/CTA.tsx
export default function CTA() {
  return (
<section className="relative bg-gradient-to-r from-[#9C27B0] to-[#6A1B9A] text-white py-20">
  <div className="max-w-4xl mx-auto px-6 text-center">
    <h2 className="text-3xl md:text-4xl font-extrabold mb-6">
      Prêt à simplifier vos{" "}
      <span className="text-[#8BC34A]">réceptions</span> et{" "}
      <span className="text-[#8BC34A]">expéditions</span> ?
    </h2>
    <p className="text-lg text-gray-200 mb-10">
      Essayez Sloti gratuitement et découvrez comment gagner du temps
      sur la gestion de vos flux logistiques.
    </p>
    <div className="flex justify-center gap-4">
      <a
        href="/signup"
        className="px-8 py-4 bg-[#8BC34A] hover:bg-green-600 text-white rounded-lg text-lg font-semibold transition"
      >
        Commencer gratuitement
      </a>
      <a
        href="/contact"
        className="px-8 py-4 border border-white hover:bg-white hover:text-[#6A1B9A] rounded-lg text-lg font-semibold transition"
      >
        Nous contacter
      </a>
    </div>
  </div>
</section>

  );
}
