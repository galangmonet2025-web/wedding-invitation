const fs = require('fs');
const path = 'c:/Users/galan/wedding-invitation/src/features/invitation/pages/InvitationContentPage.tsx';
let c = fs.readFileSync(path, 'utf8');

// Find the start of the Step 2 Galery section
const step2Start = c.indexOf('{currentStep === 2 && (');
if (step2Start === -1) {
    console.error('Could not find Stage 2 start');
    process.exit(1);
}

// Find the grid div start after Stage 2 start
const gridStart = c.indexOf('<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">', step2Start);
if (gridStart === -1) {
    console.error('Could not find grid start');
    process.exit(1);
}

// Find the closing div of that grid
// It should be followed by </div> and then )} for the {currentStep === 2 && ( ... )} block
// But wait, the Step 2 block ends later.
// The grid div ends at line 901 in the mangled version.
const gridEnd = c.indexOf('</div>', gridStart + 100) + 6; // Just a rough end for now to identify the block

// I will just replace the whole Step 2 block content to be safe.
const step2End = c.indexOf('{currentStep === 3 && (', step2Start);
if (step2End === -1) {
    console.error('Could not find Stage 3 start');
    process.exit(1);
}

const before = c.substring(0, step2Start);
const after = c.substring(step2End);

const fixedStep2 = `{currentStep === 2 && (
                            <div className="space-y-6 animate-slide-up">
                                <div className="card p-6 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600">
                                            <HiOutlinePhotograph className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Galeri & Foto Undangan</h2>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-6">Upload gambar sesuai kebutuhan variabel tema yang Anda pilih.</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {(() => {
                                            const activeTheme = themes.find(t => t.id === selectedThemeId);
                                            const typesList = (activeTheme?.image_types && activeTheme.image_types.length > 0)
                                                ? activeTheme.image_types
                                                : ['hero_cover', 'groom_photo', 'bride_photo', 'gallery', 'story_photo', 'cover', 'closing'];

                                            return (
                                                <>
                                                    {typesList.filter(t => t !== 'gallery').map(type => {
                                                        const currentImg = images.find(img => img.image_type === type);
                                                        return (
                                                            <div key={type} className="relative">
                                                                <ImageUpload
                                                                    imageType={type}
                                                                    title={type.replace('_', ' ')}
                                                                    description=""
                                                                    aspectRatio="square"
                                                                    currentImage={currentImg}
                                                                    onUploadSuccess={(img) => setImages(prev => [...prev.filter(i => i.image_type !== type), img])}
                                                                    onDeleteSuccess={(id) => setImages(prev => prev.filter(i => i.id !== id))}
                                                                    onClick={openLightbox}
                                                                />
                                                            </div>
                                                        );
                                                    })}

                                                    {typesList.includes('gallery') && (
                                                        <div className="col-span-full mt-6 border-t border-gray-100 dark:border-gray-800 pt-6">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h3 className="text-md font-semibold text-gray-800 dark:text-white">Foto Album (Multi Image)</h3>
                                                                {(() => {
                                                                    const maxGallery = tenant?.plan_type === 'premium' ? 15 : tenant?.plan_type === 'pro' ? 10 : 5;
                                                                    const currentCount = images.filter(img => img.image_type === 'gallery').length;
                                                                    return (
                                                                        <span className={\`text-xs font-medium px-2.5 py-1 rounded-full \${currentCount >= maxGallery ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'}\`}>
                                                                            {currentCount} / {maxGallery} Foto (Paket {tenant?.plan_type || 'basic'})
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                                                {images.filter(img => img.image_type === 'gallery').map(img => (
                                                                    <div key={img.id} className="relative group">
                                                                        <ImageUpload
                                                                            imageType="gallery"
                                                                            title={\`Gallery\`}
                                                                            currentImage={img}
                                                                            onUploadSuccess={() => { }}
                                                                            onDeleteSuccess={(id) => setImages(prev => prev.filter(i => i.id !== id))}
                                                                            onClick={openLightbox}
                                                                            aspectRatio="square"
                                                                        />
                                                                    </div>
                                                                ))}
                                                                {(() => {
                                                                    const maxGallery = tenant?.plan_type === 'premium' ? 15 : tenant?.plan_type === 'pro' ? 10 : 5;
                                                                    const currentCount = images.filter(img => img.image_type === 'gallery').length;
                                                                    const remainingCount = maxGallery - currentCount;
                                                                    return currentCount < maxGallery ? (
                                                                        <ImageUpload
                                                                            imageType="gallery"
                                                                            title="Tambah Foto Album"
                                                                            allowMultiple={true}
                                                                            maxFiles={remainingCount}
                                                                            onUploadSuccess={(img) => setImages(prev => [...prev.filter(i => i.id !== img.id), img])}
                                                                            onDeleteSuccess={() => { }}
                                                                            aspectRatio="square"
                                                                        />
                                                                    ) : null;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        `;

fs.writeFileSync(path, before + fixedStep2 + after);
console.log('Successfully fixed Step 2 Galery section');
