/**
 * Common Tailwind utilities and variants whose style table is pinned in
 * `golden/utility-matrix.json`. A change to the CSS conversion shows up as a
 * diff of that file, one class at a time.
 */
export const utilityMatrix = [
  // Spacing
  'p-0', 'p-1', 'p-2', 'p-4', 'p-8', 'px-4', 'py-2', 'pt-3', 'pr-5', 'pb-6', 'pl-7',
  'm-0', 'm-4', 'mx-auto', 'my-6', 'mt-2', 'mb-8', 'ml-1', 'mr-3', '-mt-2', 'gap-4', 'space-y-4',
  'ps-4', 'me-2',
  // Sizing
  'w-full', 'w-1/2', 'w-64', 'w-auto', 'max-w-xl', 'min-w-0', 'h-10', 'h-auto', 'size-8', 'max-h-screen',
  // Colours
  'bg-white', 'bg-black', 'bg-red-500', 'bg-blue-600', 'bg-gray-100', 'bg-transparent', 'bg-current', 'border-transparent', 'text-transparent',
  'bg-black/50', 'bg-white/10', 'text-blue-500/75', 'text-gray-700', 'text-white', 'border-gray-200',
  'border-red-500/20', 'decoration-red-500', 'outline-blue-500',
  // Typography
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-4xl', 'text-sm/6',
  'font-sans', 'font-serif', 'font-mono', 'font-normal', 'font-medium', 'font-semibold', 'font-bold',
  'italic', 'not-italic', 'leading-6', 'leading-tight', 'tracking-tight', 'tracking-wide',
  'uppercase', 'lowercase', 'capitalize', 'underline', 'line-through', 'no-underline',
  'text-left', 'text-center', 'text-right', 'text-justify', 'text-start', 'whitespace-nowrap', 'break-words',
  'truncate', 'tabular-nums', 'align-top', 'align-middle', 'list-disc', 'list-inside',
  // Borders and radius
  'border', 'border-0', 'border-2', 'border-t', 'border-b-4', 'border-x', 'border-solid', 'border-dashed',
  'border-none', 'divide-y', 'rounded', 'rounded-none', 'rounded-md', 'rounded-lg', 'rounded-full', 'rounded-t-lg',
  'rounded-s-lg',
  // Shadow, ring, outline, opacity, filters
  'shadow', 'shadow-sm', 'shadow-lg', 'shadow-none', 'ring', 'ring-2', 'ring-blue-500',
  'outline', 'outline-2', 'outline-offset-2', 'opacity-0', 'opacity-50', 'opacity-100', 'blur-sm', 'grayscale',
  // Display, layout, alignment
  'block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'hidden', 'table', 'table-cell',
  'items-center', 'justify-center', 'justify-between', 'flex-col', 'flex-row', 'flex-wrap', 'self-start',
  'grid-cols-2', 'relative', 'absolute', 'top-0', 'left-0', 'inset-0', 'inset-x-0', 'z-10', 'overflow-hidden',
  'cursor-pointer', 'select-none', 'object-cover',
  // Transforms, gradients, transitions
  'translate-x-2', 'rotate-45', 'scale-95', 'bg-linear-to-r', 'from-blue-500', 'to-purple-500',
  'transition-colors', 'duration-200',
  // Arbitrary values and properties
  'p-[13px]', 'mt-[7px]', 'w-[600px]', 'max-w-[600px]', 'text-[14px]', 'leading-[22px]', 'leading-[1.4]',
  'text-[#123456]', 'bg-[#f00a]', 'bg-[#ff000080]', 'text-[rgb(10_20_30)]', 'bg-[oklch(70%_0.1_200)]',
  'rounded-[4px]', 'w-[calc(100%-2rem)]', 'grid-cols-[1fr_2fr]', 'bg-[url(\'/x.png\')]',
  '[mso-line-height-rule:exactly]', 'before:content-[\'*\']',
  // Variants
  'sm:p-6', 'sm:text-lg', 'md:w-1/2', 'md:hidden', 'lg:flex', 'max-sm:hidden', 'sm:hover:bg-red-500',
  'hover:bg-blue-700', 'hover:underline', 'focus:outline-none', 'focus:ring-2',
  'dark:bg-gray-900', 'dark:text-white', 'first:mt-0', 'last:mb-0', 'group', 'group-hover:text-red-500',
  'print:hidden', 'animate-spin',
]
