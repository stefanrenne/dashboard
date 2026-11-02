# Runs every fenced code block of the staged Pages site through Rouge, the site's highlighter,
# and fails on a block it marks as an error (red on the page). Run by the Pages workflow after
# scripts/pages.sh, with the Rouge version GitHub Pages uses.
#   ruby scripts/check-highlight.rb <staged site>
require 'rouge'

dir = ARGV[0] or abort 'usage: check-highlight.rb <staged site>'
problems = []
Dir.glob(File.join(dir, '**', '*.md')).sort.each do |file|
  lines = File.readlines(file, chomp: true)
  i = 0
  while i < lines.length
    open = lines[i].match(/\A(\s*)(```+|~~~+)\s*([\w+-]*)/)
    i += 1
    next unless open
    fence, lang, start = open[2], open[3], i
    i += 1 while i < lines.length && !lines[i].strip.start_with?(fence)
    code = lines[start...i].map { |l| l.delete_prefix(open[1]) }.join("\n")
    i += 1
    lexer = lang.empty? ? nil : Rouge::Lexer.find(lang) # no language: plain text, never red
    next unless lexer
    offset = 0
    lexer.lex(code).each do |token, value|
      if token == Rouge::Token::Tokens::Error
        line = start + 1 + code[0, offset].count("\n")
        problems << "#{file}:#{line}: #{lang} marks #{value.inspect} as an error"
      end
      offset += value.length
    end
  end
end
puts problems
abort "#{problems.length} highlighting error(s)" unless problems.empty?
puts 'code blocks highlight without errors'
