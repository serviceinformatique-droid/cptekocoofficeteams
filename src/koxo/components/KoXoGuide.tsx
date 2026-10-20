import React from 'react';
import { X, CheckCircle, AlertCircle, Info, BookOpen, Layers, Terminal, Key } from 'lucide-react';

interface KoXoGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KoXoGuide: React.FC<KoXoGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#2D2C28]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#F9F8F6] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#D1CDC4]">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-[#D1CDC4] flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#E2E8D5] text-[#5A5A40] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-serif italic text-[#5A5A40]">
                Guide d'importation dans KoXo Administrator
              </h3>
              <p className="text-xs text-[#8C867A]">
                Procédure pas-à-pas pour intégrer le fichier CSV préparé dans votre Active Directory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C867A] hover:text-[#42413C] hover:bg-[#F0EEEA] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs text-[#42413C] leading-relaxed">
          {/* Why this tool? */}
          <div className="bg-[#E2E8D5]/60 border border-[#C5CCB3] rounded-xl p-4 flex gap-3 text-[#42413C]">
            <Info className="w-5 h-5 text-[#5A5A40] shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-[#5A5A40] mb-1">Pourquoi ce traitement est indispensable :</strong>
              Dans KoXo Administrator et Windows Server Active Directory, les noms de comptes trop longs (&gt; 12 ou 20 caractères selon vos modèles) ou les homonymes provoquent des erreurs bloquantes lors de la génération en masse. Grâce à cet outil :
              <ul className="list-disc pl-4 mt-1.5 space-y-0.5 text-[#5A5A40]">
                <li>Les <strong>professeurs</strong> restent strictement intacts selon votre fichier d'origine.</li>
                <li>Les <strong>élèves</strong> homonymes reçoivent un numéro incrémenté (ex: MARTIN, MARTIN1, MARTIN2).</li>
                <li>La longueur totale de chaque identifiant est <strong>garantie ≤ 12 caractères</strong>, même après ajout du numéro.</li>
              </ul>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C867A]">
              Étapes d'importation dans KoXo Administrator
            </h4>

            {/* Step 1 */}
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#5A5A40] text-white flex items-center justify-center shrink-0 font-bold text-xs">
                1
              </div>
              <div className="space-y-1 flex-1">
                <div className="font-serif text-base text-[#42413C]">Télécharger le fichier CSV préparé</div>
                <p className="text-[#8C867A]">
                  Cliquez sur <strong>"Télécharger le CSV"</strong>. Le fichier généré utilise le séparateur point-virgule (<code className="bg-[#F0EEEA] px-1 py-0.5 rounded font-mono text-[#42413C] border border-[#D1CDC4]">{';'}</code>) et l'encodage UTF-8 avec BOM, parfaitement reconnu par Windows et Excel.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#5A5A40] text-white flex items-center justify-center shrink-0 font-bold text-xs">
                2
              </div>
              <div className="space-y-1 flex-1">
                <div className="font-serif text-base text-[#42413C]">Ouvrir KoXo Administrator</div>
                <p className="text-[#8C867A]">
                  Lancez votre console <strong>KoXo Administrator</strong> sur le serveur contrôleur de domaine (ou via la console distante).
                </p>
                <div className="bg-[#F0EEEA] p-2.5 rounded-lg border border-[#D1CDC4] font-mono text-[11px] text-[#42413C]">
                  Menu : <strong>Gestion</strong> &gt; <strong>Importation de données</strong> (ou raccourci Ctrl+I)
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#5A5A40] text-white flex items-center justify-center shrink-0 font-bold text-xs">
                3
              </div>
              <div className="space-y-1 flex-1">
                <div className="font-serif text-base text-[#42413C]">Configurer la source d'importation</div>
                <p className="text-[#8C867A]">
                  Sélectionnez le fichier CSV téléchargé et vérifiez les paramètres d'importation KoXo :
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[#8C867A]">
                  <li><strong>Type de fichier :</strong> Texte délimité / CSV</li>
                  <li><strong>Séparateur :</strong> Point-virgule (;)</li>
                  <li><strong>Première ligne :</strong> Cocher "La première ligne contient les en-têtes"</li>
                </ul>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#5A5A40] text-white flex items-center justify-center shrink-0 font-bold text-xs">
                4
              </div>
              <div className="space-y-1 flex-1">
                <div className="font-serif text-base text-[#42413C]">Mapper les colonnes avec les attributs KoXo</div>
                <p className="text-[#8C867A]">
                  Associez les colonnes de votre fichier avec le modèle d'import KoXo :
                </p>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <div className="bg-white p-2 rounded border border-[#D1CDC4]">
                    <span className="text-[#8C867A] font-bold block text-[11px]">Colonne du fichier</span>
                    <span className="font-mono font-bold text-[#42413C]">Nom</span>
                  </div>
                  <div className="bg-[#E2E8D5]/50 p-2 rounded border border-[#C5CCB3]">
                    <span className="text-[#5A5A40] font-bold block text-[11px]">Champ KoXo / AD</span>
                    <span className="font-mono font-bold text-[#5A5A40]">Nom (sn)</span>
                  </div>

                  <div className="bg-white p-2 rounded border border-[#D1CDC4]">
                    <span className="text-[#8C867A] font-bold block text-[11px]">Colonne du fichier</span>
                    <span className="font-mono font-bold text-[#42413C]">Prénom</span>
                  </div>
                  <div className="bg-[#E2E8D5]/50 p-2 rounded border border-[#C5CCB3]">
                    <span className="text-[#5A5A40] font-bold block text-[11px]">Champ KoXo / AD</span>
                    <span className="font-mono font-bold text-[#5A5A40]">Prénom (givenName)</span>
                  </div>

                  <div className="bg-white p-2 rounded border border-[#D1CDC4]">
                    <span className="text-[#8C867A] font-bold block text-[11px]">Colonne du fichier</span>
                    <span className="font-mono font-bold text-[#42413C]">Identifiant</span>
                  </div>
                  <div className="bg-[#E2E8D5]/50 p-2 rounded border border-[#C5CCB3]">
                    <span className="text-[#5A5A40] font-bold block text-[11px]">Champ KoXo / AD</span>
                    <span className="font-mono font-bold text-[#5A5A40]">Login (samAccountName)</span>
                  </div>

                  <div className="bg-white p-2 rounded border border-[#D1CDC4]">
                    <span className="text-[#8C867A] font-bold block text-[11px]">Colonne du fichier</span>
                    <span className="font-mono font-bold text-[#42413C]">Code Classe</span>
                  </div>
                  <div className="bg-[#E2E8D5]/50 p-2 rounded border border-[#C5CCB3]">
                    <span className="text-[#5A5A40] font-bold block text-[11px]">Champ KoXo / AD</span>
                    <span className="font-mono font-bold text-[#5A5A40]">Classe / Division (Groupe KoXo)</span>
                  </div>

                  <div className="bg-white p-2 rounded border border-[#D1CDC4]">
                    <span className="text-[#8C867A] font-bold block text-[11px]">Colonne du fichier</span>
                    <span className="font-mono font-bold text-[#42413C]">Mot de passe</span>
                  </div>
                  <div className="bg-[#E2E8D5]/50 p-2 rounded border border-[#C5CCB3]">
                    <span className="text-[#5A5A40] font-bold block text-[11px]">Champ KoXo / AD</span>
                    <span className="font-mono font-bold text-[#5A5A40]">Mot de passe initial (userPassword)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#5A5A40] text-white flex items-center justify-center shrink-0 font-bold text-xs">
                5
              </div>
              <div className="space-y-1 flex-1">
                <div className="font-serif text-base text-[#42413C]">Simuler puis exécuter la création des comptes</div>
                <p className="text-[#8C867A]">
                  Dans KoXo, lancez d'abord la <strong>Simulation</strong> (Bouton Tester / Simuler). Tous les comptes passeront au vert car aucun identifiant ne dépassera 12 caractères et les doublons sont déjà neutralisés. Cliquez ensuite sur <strong>Appliquer</strong> pour générer les comptes Active Directory, boîtes mails et dossiers partagés.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-[#D1CDC4] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
          >
            Fermer le guide
          </button>
        </div>
      </div>
    </div>
  );
};
